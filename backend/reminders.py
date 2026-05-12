"""
Reminders Module
================

Extracted from server.py monolith during modularisation (Session 11).

Endpoints:
  POST   /api/reminders                  Create a reminder (supports advanced rule)
  GET    /api/reminders                  List + filter + related-item enrichment
  GET    /api/reminders/summary          Dashboard summary counts
  PUT    /api/reminders/{id}             Update / complete / snooze a reminder
  DELETE /api/reminders/{id}             Delete a reminder

Why this module exists
----------------------
server.py grew past 4500 lines. Starting with reminders (recently-touched,
self-contained, 5 endpoints + helper) as the first slice to prove out the
pattern. Subsequent slices (accounts, investments, bills, etc.) follow the
same recipe: import `db` from `firebase_config` directly, lazy-import
`get_current_user` from `server` to avoid circular imports, and register via
`app.include_router(reminders_router)` at the bottom of server.py.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from firebase_config import db

reminders_router = APIRouter(prefix="/api", tags=["reminders"])


# ==================== MODELS ====================

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_date: str  # ISO date
    reminder_type: str  # investment, loan_emi, credit_card, lending, bill, insurance, custom
    related_id: Optional[str] = None
    is_recurring: bool = False
    recurrence: Optional[str] = None  # daily, weekly, monthly, quarterly, yearly
    # Advanced rule (per Add Reminder spec)
    url: Optional[str] = None
    end_type: Optional[str] = "never"       # 'never' | 'on' | 'after'
    end_date: Optional[str] = None          # ISO date when end_type='on'
    max_occurrences: Optional[int] = None   # when end_type='after'


class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_date: Optional[str] = None
    is_completed: Optional[bool] = None
    is_recurring: Optional[bool] = None
    recurrence: Optional[str] = None
    # Advanced rule
    url: Optional[str] = None
    end_type: Optional[str] = None
    end_date: Optional[str] = None
    max_occurrences: Optional[int] = None
    # Convenience
    snooze_until: Optional[str] = None


# ==================== HELPERS ====================

async def _get_user(request: Request):
    # Lazy import avoids a circular dependency between this module and server.py
    from server import get_current_user
    return await get_current_user(request)


def _next_occurrence(current: datetime, recurrence: Optional[str]) -> Optional[datetime]:
    """Compute the next firing time for a recurring reminder.

    Uses `dateutil.relativedelta` for month-calibrated rollover; falls back to
    naive day arithmetic if dateutil isn't available.
    """
    if not recurrence or recurrence == "none":
        return None
    if recurrence == "daily":
        return current + timedelta(days=1)
    if recurrence == "weekly":
        return current + timedelta(days=7)
    try:
        from dateutil.relativedelta import relativedelta
    except Exception:
        relativedelta = None  # type: ignore
    if recurrence == "monthly":
        return current + (relativedelta(months=1) if relativedelta else timedelta(days=30))
    if recurrence == "quarterly":
        return current + (relativedelta(months=3) if relativedelta else timedelta(days=91))
    if recurrence == "yearly":
        return current + (relativedelta(years=1) if relativedelta else timedelta(days=365))
    return None


# ==================== ENDPOINTS ====================

@reminders_router.post("/reminders")
async def create_reminder(data: ReminderCreate, request: Request):
    user = await _get_user(request)
    reminder_id = f"rem_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    reminder = {
        "reminder_id": reminder_id,
        "user_id": user.user_id,
        "title": data.title,
        "description": data.description,
        "reminder_date": datetime.fromisoformat(data.reminder_date.replace("Z", "+00:00")),
        "reminder_type": data.reminder_type,
        "related_id": data.related_id,
        "is_recurring": data.is_recurring,
        "recurrence": data.recurrence,
        # Advanced rule
        "url": data.url,
        "end_type": data.end_type or "never",
        "end_date": (
            datetime.fromisoformat(data.end_date.replace("Z", "+00:00"))
            if data.end_date else None
        ),
        "max_occurrences": data.max_occurrences,
        "completion_count": 0,
        "is_completed": False,
        "created_at": now,
        "updated_at": now,
    }
    await db.reminders.insert_one(reminder)
    reminder.pop("_id", None)
    return reminder


@reminders_router.get("/reminders")
async def get_reminders(
    request: Request,
    reminder_type: Optional[str] = None,
    is_completed: Optional[bool] = None,
    upcoming: Optional[bool] = None,
):
    user = await _get_user(request)
    query: Dict = {"user_id": user.user_id}
    if reminder_type:
        query["reminder_type"] = reminder_type
    if is_completed is not None:
        query["is_completed"] = is_completed
    if upcoming:
        query["reminder_date"] = {"$gte": datetime.now(timezone.utc)}
        query["is_completed"] = False
    reminders = await db.reminders.find(query, {"_id": 0}).sort("reminder_date", 1).to_list(1000)

    # Enrich with related item details (for client display).
    type_to_lookup = {
        "investment":  ("investments", "investment_id", {"name": 1, "investment_type": 1, "current_value": 1}),
        "loan_emi":    ("loans",       "loan_id",       {"name": 1, "loan_type": 1, "emi_amount": 1}),
        "credit_card": ("credit_cards","card_id",       {"name": 1, "current_outstanding": 1}),
        "lending":     ("lending",     "lending_id",    {"person_name": 1, "lending_type": 1, "remaining_amount": 1}),
        "bill":        ("bills",       "bill_id",       {"name": 1, "amount": 1}),
    }
    for r in reminders:
        rid = r.get("related_id")
        mapping = type_to_lookup.get(r.get("reminder_type"))
        if not rid or not mapping:
            continue
        coll_name, key, proj = mapping
        projection = {"_id": 0, **proj}
        r["related_item"] = await getattr(db, coll_name).find_one({key: rid}, projection)
    return reminders


@reminders_router.get("/reminders/summary")
async def get_reminders_summary(request: Request):
    user = await _get_user(request)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=7)

    total = await db.reminders.count_documents({"user_id": user.user_id, "is_completed": False})
    overdue = await db.reminders.count_documents(
        {"user_id": user.user_id, "is_completed": False, "reminder_date": {"$lt": now}}
    )
    today = await db.reminders.count_documents(
        {"user_id": user.user_id, "is_completed": False,
         "reminder_date": {"$gte": today_start, "$lt": today_end}}
    )
    this_week = await db.reminders.count_documents(
        {"user_id": user.user_id, "is_completed": False,
         "reminder_date": {"$gte": today_start, "$lt": week_end}}
    )

    upcoming_list = await db.reminders.find(
        {"user_id": user.user_id, "is_completed": False, "reminder_date": {"$gte": now}},
        {"_id": 0},
    ).sort("reminder_date", 1).to_list(5)

    overdue_list = await db.reminders.find(
        {"user_id": user.user_id, "is_completed": False, "reminder_date": {"$lt": now}},
        {"_id": 0},
    ).sort("reminder_date", -1).to_list(5)

    return {
        "total_pending": total,
        "overdue": overdue,
        "today": today,
        "this_week": this_week,
        "upcoming": upcoming_list,
        "overdue_list": overdue_list,
    }


@reminders_router.put("/reminders/{reminder_id}")
async def update_reminder(reminder_id: str, data: ReminderUpdate, request: Request):
    user = await _get_user(request)
    existing = await db.reminders.find_one(
        {"reminder_id": reminder_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Reminder not found")

    payload = data.model_dump(exclude_unset=True)
    update_data: Dict = {k: v for k, v in payload.items() if v is not None}

    # snooze_until shortcut — forwards reminder_date
    if "snooze_until" in update_data:
        snooze_iso = update_data.pop("snooze_until")
        try:
            update_data["reminder_date"] = datetime.fromisoformat(
                str(snooze_iso).replace("Z", "+00:00")
            )
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid snooze_until date")

    # ISO -> datetime
    for fld in ("reminder_date", "end_date"):
        if fld in update_data and isinstance(update_data[fld], str):
            update_data[fld] = datetime.fromisoformat(update_data[fld].replace("Z", "+00:00"))

    # Recurring reminders auto-advance on complete, until end_type terminates them
    if update_data.get("is_completed") is True and existing.get("is_recurring"):
        existing_dt = existing.get("reminder_date") or datetime.now(timezone.utc)
        if isinstance(existing_dt, str):
            try:
                existing_dt = datetime.fromisoformat(existing_dt.replace("Z", "+00:00"))
            except ValueError:
                existing_dt = datetime.now(timezone.utc)
        next_dt = _next_occurrence(existing_dt, existing.get("recurrence"))
        completion_count = int(existing.get("completion_count") or 0) + 1
        end_type = existing.get("end_type") or "never"
        max_occ = existing.get("max_occurrences")
        end_date = existing.get("end_date")
        if isinstance(end_date, str):
            try:
                end_date = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
            except ValueError:
                end_date = None

        reached_max = end_type == "after" and max_occ and completion_count >= max_occ
        past_end = end_type == "on" and end_date and next_dt and next_dt > end_date

        if next_dt and not reached_max and not past_end:
            update_data["is_completed"] = False
            update_data["reminder_date"] = next_dt
            update_data["completion_count"] = completion_count
        else:
            update_data["is_completed"] = True
            update_data["completion_count"] = completion_count

    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.reminders.update_one({"reminder_id": reminder_id}, {"$set": update_data})
    return await db.reminders.find_one({"reminder_id": reminder_id}, {"_id": 0})


@reminders_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, request: Request):
    user = await _get_user(request)
    result = await db.reminders.delete_one(
        {"reminder_id": reminder_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}
