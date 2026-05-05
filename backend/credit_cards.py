"""
Credit Cards Module
===================

Extracted from server.py monolith during modularisation (Session 14).

Endpoints:
  POST   /api/credit-cards              Create card
  GET    /api/credit-cards              List active cards
  GET    /api/credit-cards/report       Period-wise report (limit, outstanding, EMI, dues)
  PUT    /api/credit-cards/{card_id}    Update card
  DELETE /api/credit-cards/{card_id}    Soft-delete card
"""
from __future__ import annotations

import calendar
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from firebase_config import db

credit_cards_router = APIRouter(prefix="/api", tags=["credit-cards"])


# ==================== MODELS ====================

class CreditCardCreate(BaseModel):
    name: str
    card_number_last4: str = ""
    credit_limit: float
    current_outstanding: float = 0.0
    billing_date: int = 1
    due_date: int = 15
    due_time: str = "10:00"
    interest_rate: float = 0.0
    family_member_id: Optional[str] = None
    emis: Optional[List[Dict]] = []


class CreditCardUpdate(BaseModel):
    name: Optional[str] = None
    credit_limit: Optional[float] = None
    current_outstanding: Optional[float] = None
    billing_date: Optional[int] = None
    due_date: Optional[int] = None
    due_time: Optional[str] = None
    interest_rate: Optional[float] = None
    emis: Optional[List[Dict]] = None


# ==================== HELPERS ====================

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ==================== ENDPOINTS ====================

@credit_cards_router.post("/credit-cards")
async def create_credit_card(data: CreditCardCreate, request: Request):
    user = await _get_user(request)
    card_id = f"cc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    card = {
        "card_id": card_id, "user_id": user.user_id, "name": data.name,
        "card_number_last4": data.card_number_last4, "credit_limit": data.credit_limit,
        "current_outstanding": data.current_outstanding, "billing_date": data.billing_date,
        "due_date": data.due_date, "due_time": data.due_time, "interest_rate": data.interest_rate,
        "family_member_id": data.family_member_id, "emis": data.emis or [],
        "is_active": True, "created_at": now, "updated_at": now,
    }
    await db.credit_cards.insert_one(card)
    card.pop("_id", None)
    return card


@credit_cards_router.get("/credit-cards")
async def get_credit_cards(request: Request):
    user = await _get_user(request)
    return await db.credit_cards.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)


@credit_cards_router.get("/credit-cards/report")
async def credit_card_report(request: Request, period: str = "monthly"):
    """Aggregated card report with utilisation + upcoming-due statuses."""
    user = await _get_user(request)
    cards = await db.credit_cards.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).to_list(100)
    now = datetime.now(timezone.utc)

    total_limit = sum(c.get("credit_limit", 0) for c in cards)
    total_outstanding = sum(c.get("current_outstanding", 0) for c in cards)
    total_available = total_limit - total_outstanding
    total_emi = sum(sum(e.get("amount", 0) for e in c.get("emis", [])) for c in cards)

    upcoming_dues = []
    for c in cards:
        due_day = c.get("due_date", 15)
        due_time = c.get("due_time", "10:00")
        _, max_day_this_month = calendar.monthrange(now.year, now.month)
        clamped_day = min(due_day, max_day_this_month)
        if now.day <= clamped_day:
            next_due = now.replace(day=clamped_day)
        else:
            next_month = now.month + 1 if now.month < 12 else 1
            next_year = now.year if now.month < 12 else now.year + 1
            _, max_day_next_month = calendar.monthrange(next_year, next_month)
            next_due = now.replace(
                year=next_year, month=next_month,
                day=min(due_day, max_day_next_month),
            )
        days_until = (next_due - now).days
        status = (
            "overdue"  if days_until < 0  else
            "critical" if days_until <= 3 else
            "warning"  if days_until <= 7 else
            "safe"
        )
        upcoming_dues.append({
            "card_id": c["card_id"], "name": c["name"],
            "outstanding": c.get("current_outstanding", 0),
            "due_day": due_day, "due_time": due_time,
            "next_due_date": str(next_due.date()),
            "days_until": days_until, "status": status,
        })
    upcoming_dues.sort(key=lambda x: x["days_until"])

    return {
        "summary": {
            "total_cards": len(cards),
            "total_limit": total_limit,
            "total_outstanding": total_outstanding,
            "total_available": total_available,
            "total_emi": total_emi,
            "utilization": round(total_outstanding / total_limit * 100, 1) if total_limit > 0 else 0,
        },
        "upcoming_dues": upcoming_dues,
        "cards": cards,
    }


@credit_cards_router.put("/credit-cards/{card_id}")
async def update_credit_card(card_id: str, data: CreditCardUpdate, request: Request):
    user = await _get_user(request)
    existing = await db.credit_cards.find_one(
        {"card_id": card_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Credit card not found")
    update_data = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.credit_cards.update_one({"card_id": card_id}, {"$set": update_data})
    return await db.credit_cards.find_one({"card_id": card_id}, {"_id": 0})


@credit_cards_router.delete("/credit-cards/{card_id}")
async def delete_credit_card(card_id: str, request: Request):
    user = await _get_user(request)
    existing = await db.credit_cards.find_one(
        {"card_id": card_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Credit card not found")
    await db.credit_cards.update_one(
        {"card_id": card_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Credit card deactivated"}
