"""
EMI Reminders Module
====================

Manages per-EMI schedule entries and bridges into the existing generic
reminders system for push notifications.

Collection: emi_reminders

Design:
  Each row in `emi_reminders` represents ONE scheduled EMI instalment with
  full amortization metadata (emi_number, principal_component, interest_component,
  balance_after, status).

  For NOTIFICATIONS the module reuses the existing `reminders` collection —
  creating a reminder record with reminder_type="loan_emi" and related_id=loan_id.
  This means:
    • expo-notifications hooks in reminderNotifications.ts fire automatically
    • The existing reminder summary/calendar/view-all screens show EMI reminders
    • No duplication of notification plumbing

Endpoints:
  POST  /api/loans/{loan_id}/emi-schedule          Generate EMI schedule (idempotent)
  GET   /api/loans/{loan_id}/emi-schedule          List EMI schedule rows
  GET   /api/loans/{loan_id}/emi-schedule/{emi_no} Single EMI row
  PUT   /api/emi-reminders/{emi_reminder_id}       Mark paid / update status
  DELETE /api/emi-reminders/{emi_reminder_id}      Remove a scheduled EMI row
  GET   /api/emi-reminders/upcoming                Upcoming EMIs across all loans
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from firebase_config import db

emi_reminders_router = APIRouter(prefix="/api", tags=["emi_reminders"])


# ==================== MODELS ====================

class EMIReminderStatusUpdate(BaseModel):
    """Update the status of a scheduled EMI instalment."""
    status: Literal["pending", "paid", "overdue", "skipped"]
    paid_date: Optional[str] = None
    paid_amount: Optional[float] = None
    loan_transaction_id: Optional[str] = None   # link to loan_transactions once paid
    notes: Optional[str] = None


# ==================== AUTH HELPER ====================

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ==================== HELPERS ====================

def _advance_month(dt: datetime, months: int = 1) -> datetime:
    """Advance a datetime by N calendar months, clamping day to 28."""
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    day = min(dt.day, 28)
    return datetime(year, month, day, tzinfo=timezone.utc)


async def _create_reminders_entry(
    user_id: str,
    loan_id: str,
    emi_reminder_id: str,
    emi_number: int,
    due_date: datetime,
    emi_amount: float,
    loan_name: str,
) -> Optional[str]:
    """Create a corresponding entry in the generic `reminders` collection.

    Returns the reminder_id or None on failure (non-blocking).
    """
    try:
        reminder_id = f"rem_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        reminder = {
            "reminder_id": reminder_id,
            "user_id": user_id,
            "title": f"EMI #{emi_number} — {loan_name}",
            "description": f"EMI amount: ₹{emi_amount:,.2f}",
            "reminder_date": due_date,
            "reminder_type": "loan_emi",
            "related_id": loan_id,
            "is_recurring": False,
            "recurrence": None,
            "url": None,
            "end_type": "never",
            "end_date": None,
            "max_occurrences": None,
            "completion_count": 0,
            "is_completed": False,
            # back-reference to the structured EMI row
            "emi_reminder_id": emi_reminder_id,
            "created_at": now,
            "updated_at": now,
        }
        await db.reminders.insert_one(reminder)
        return reminder_id
    except Exception:
        return None


# ==================== ENDPOINTS ====================

@emi_reminders_router.post("/loans/{loan_id}/emi-schedule")
async def generate_emi_schedule(
    loan_id: str,
    request: Request,
    overwrite: bool = False,
):
    """Generate (or regenerate) the EMI schedule for a loan.

    Idempotent by default — skips EMI numbers that already exist.
    Pass ?overwrite=true to delete existing schedule and regenerate from scratch.
    """
    user = await _get_user(request)
    loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    tenure = int(loan.get("tenure_months", 0))
    emi_amount = float(loan.get("emi_amount", 0))
    principal = float(loan.get("principal_amount", 0))
    annual_rate = float(loan.get("interest_rate", 0))
    monthly_rate = annual_rate / 12 / 100
    interest_type = loan.get("interest_type", "reducing_balance")

    start_raw = loan.get("start_date")
    if isinstance(start_raw, str):
        start_date = datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
    else:
        start_date = start_raw

    # If overwrite, delete existing schedule AND its reminders entries
    if overwrite:
        existing_rows = await db.emi_reminders.find(
            {"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0}
        ).to_list(1000)
        for row in existing_rows:
            rid = row.get("reminder_id")
            if rid:
                await db.reminders.delete_one({"reminder_id": rid})
        await db.emi_reminders.delete_many({"loan_id": loan_id, "user_id": user.user_id})

    # Determine already-generated EMI numbers
    existing_emis = await db.emi_reminders.find(
        {"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0}
    ).to_list(500)
    existing_emi_numbers = {int(r.get("emi_number", 0)) for r in existing_emis}

    created = []
    balance = principal
    loan_name = loan.get("name", "Loan")
    now = datetime.now(timezone.utc)
    emis_paid = int(loan.get("emis_paid", 0))

    for i in range(1, tenure + 1):
        if i in existing_emi_numbers:
            continue  # already exists — skip (idempotent)

        due_date = _advance_month(start_date, i - 1)

        # Per-EMI interest/principal split
        if interest_type == "flat_rate":
            interest_comp = round(principal * monthly_rate, 2)
        else:
            interest_comp = round(balance * monthly_rate, 2)

        principal_comp = round(emi_amount - interest_comp, 2)
        principal_comp = max(principal_comp, 0)

        # Last EMI — absorb residual balance
        if i == tenure:
            principal_comp = round(balance, 2)
        balance_after = round(max(balance - principal_comp, 0), 2)

        # Status: already paid if EMI number <= emis_paid
        status = "paid" if i <= emis_paid else "pending"

        emi_reminder_id = f"emir_{uuid.uuid4().hex[:12]}"

        # Create bridging entry in generic reminders (for notifications)
        reminder_id = None
        if status == "pending":
            reminder_id = await _create_reminders_entry(
                user_id=user.user_id,
                loan_id=loan_id,
                emi_reminder_id=emi_reminder_id,
                emi_number=i,
                due_date=due_date,
                emi_amount=emi_amount,
                loan_name=loan_name,
            )

        row = {
            "emi_reminder_id": emi_reminder_id,
            "loan_id": loan_id,
            "user_id": user.user_id,

            # Schedule metadata
            "emi_number": i,
            "due_date": due_date,
            "emi_amount": emi_amount,
            "principal_component": principal_comp,
            "interest_component": interest_comp,
            "balance_before": round(balance, 2),
            "balance_after": balance_after,

            # Status tracking
            "status": status,           # pending | paid | overdue | skipped
            "paid_date": None,
            "paid_amount": None,
            "loan_transaction_id": None,  # FK → loan_transactions (set when paid)

            # Bridge to notifications
            "reminder_id": reminder_id,   # FK → reminders collection

            "notes": None,
            "created_at": now,
            "updated_at": now,
        }

        await db.emi_reminders.insert_one(row)
        row.pop("_id", None)
        created.append(row)

        balance = balance_after

    return {
        "loan_id": loan_id,
        "tenure_months": tenure,
        "created_count": len(created),
        "skipped_count": len(existing_emi_numbers),
        "reminders": created,
    }


@emi_reminders_router.get("/loans/{loan_id}/emi-schedule")
async def get_emi_schedule(
    loan_id: str,
    request: Request,
    status: Optional[str] = None,
):
    """List all EMI schedule rows for a loan with optional status filter."""
    user = await _get_user(request)
    loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    query: dict = {"loan_id": loan_id, "user_id": user.user_id}
    if status:
        query["status"] = status

    rows = await db.emi_reminders.find(query, {"_id": 0}).sort("emi_number", 1).to_list(500)
    return rows


@emi_reminders_router.get("/loans/{loan_id}/emi-schedule/{emi_number}")
async def get_single_emi(loan_id: str, emi_number: int, request: Request):
    """Get a single EMI row by EMI number."""
    user = await _get_user(request)
    row = await db.emi_reminders.find_one(
        {"loan_id": loan_id, "emi_number": emi_number, "user_id": user.user_id},
        {"_id": 0},
    )
    if not row:
        raise HTTPException(status_code=404, detail="EMI not found")
    return row


@emi_reminders_router.put("/emi-reminders/{emi_reminder_id}")
async def update_emi_status(
    emi_reminder_id: str, data: EMIReminderStatusUpdate, request: Request
):
    """Mark an EMI as paid / overdue / skipped and sync the reminder."""
    user = await _get_user(request)
    existing = await db.emi_reminders.find_one(
        {"emi_reminder_id": emi_reminder_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="EMI reminder not found")

    now = datetime.now(timezone.utc)
    update_payload: dict = {
        "status": data.status,
        "updated_at": now,
    }
    if data.paid_date:
        update_payload["paid_date"] = datetime.fromisoformat(
            data.paid_date.replace("Z", "+00:00")
        )
    if data.paid_amount is not None:
        update_payload["paid_amount"] = data.paid_amount
    if data.loan_transaction_id:
        update_payload["loan_transaction_id"] = data.loan_transaction_id
    if data.notes:
        update_payload["notes"] = data.notes

    await db.emi_reminders.update_one(
        {"emi_reminder_id": emi_reminder_id}, {"$set": update_payload}
    )

    # Sync the bridged generic reminder — mark completed if EMI paid
    reminder_id = existing.get("reminder_id")
    if reminder_id:
        is_completed = data.status in ("paid", "skipped")
        await db.reminders.update_one(
            {"reminder_id": reminder_id},
            {"$set": {"is_completed": is_completed, "updated_at": now}},
        )

    return await db.emi_reminders.find_one(
        {"emi_reminder_id": emi_reminder_id}, {"_id": 0}
    )


@emi_reminders_router.delete("/emi-reminders/{emi_reminder_id}")
async def delete_emi_reminder(emi_reminder_id: str, request: Request):
    """Remove an EMI schedule row and its bridged generic reminder."""
    user = await _get_user(request)
    existing = await db.emi_reminders.find_one(
        {"emi_reminder_id": emi_reminder_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="EMI reminder not found")

    # Delete the bridged reminder
    reminder_id = existing.get("reminder_id")
    if reminder_id:
        await db.reminders.delete_one({"reminder_id": reminder_id})

    await db.emi_reminders.delete_one({"emi_reminder_id": emi_reminder_id})
    return {"message": "EMI reminder deleted"}


@emi_reminders_router.get("/emi-reminders/upcoming")
async def get_upcoming_emis(
    request: Request,
    days_ahead: int = 30,
):
    """Return upcoming pending EMIs across ALL loans within the next N days."""
    user = await _get_user(request)
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(days=days_ahead)

    rows = await db.emi_reminders.find(
        {"user_id": user.user_id, "status": "pending"}, {"_id": 0}
    ).sort("due_date", 1).to_list(500)

    # Client-side date filter (Firestore wrapper doesn't do composite range queries well)
    upcoming = []
    for row in rows:
        due_raw = row.get("due_date")
        if not due_raw:
            continue
        if isinstance(due_raw, str):
            try:
                due_dt = datetime.fromisoformat(due_raw.replace("Z", "+00:00"))
            except ValueError:
                continue
        else:
            due_dt = due_raw

        if due_dt.tzinfo is None:
            due_dt = due_dt.replace(tzinfo=timezone.utc)

        if now <= due_dt <= cutoff:
            days_to_due = (due_dt - now).days
            row["days_to_due"] = days_to_due
            row["is_overdue"] = False
            upcoming.append(row)
        elif due_dt < now:
            row["days_to_due"] = (due_dt - now).days   # negative
            row["is_overdue"] = True
            upcoming.append(row)

    upcoming.sort(key=lambda x: x.get("due_date", ""))
    return upcoming
