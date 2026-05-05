"""
Bills Module
============

Extracted from server.py monolith during modularisation (Session 12).

Endpoints:
  POST   /api/bills                Create new bill
  GET    /api/bills                List + filter (month, year, category, status)
  GET    /api/bills/summary        Status buckets (overdue/upcoming/paid)
  GET    /api/bills/{id}           Get one bill
  PUT    /api/bills/{id}           Update bill
  DELETE /api/bills/{id}           Delete bill (cascades to payments)

The `Bill` response model is duplicated here from server.py so this module
remains self-contained. Anyone editing the canonical model in server.py
should update this file too — TODO: dedupe by promoting to /app/backend/models/.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request, Header
from pydantic import BaseModel

from firebase_config import db

bills_router = APIRouter(prefix="/api", tags=["bills"])


# ==================== MODELS ====================

class Bill(BaseModel):
    bill_id: str
    user_id: str
    family_member_id: Optional[str] = None
    account_id: Optional[str] = None
    name: str
    amount: float
    currency: str = "INR"
    due_date: datetime
    category: str
    vendor: Optional[str] = None
    notes: Optional[str] = None
    receipt_image: Optional[str] = None  # base64
    is_recurring: bool = False
    recurrence_type: Optional[str] = None  # daily, weekly, monthly, yearly
    recurrence_interval: Optional[int] = 1
    payment_status: str = "unpaid"  # unpaid, paid
    created_at: datetime
    updated_at: datetime


class BillCreate(BaseModel):
    name: str
    amount: float
    currency: str = "INR"
    due_date: str
    category: str
    vendor: Optional[str] = None
    notes: Optional[str] = None
    receipt_image: Optional[str] = None
    is_recurring: bool = False
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = 1
    account_id: Optional[str] = None
    family_member_id: Optional[str] = None


class BillUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    due_date: Optional[str] = None
    category: Optional[str] = None
    vendor: Optional[str] = None
    notes: Optional[str] = None
    receipt_image: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = None
    payment_status: Optional[str] = None
    account_id: Optional[str] = None


# ==================== HELPERS ====================

async def _get_user(request: Request):
    # Lazy import avoids circular dependency with server.py
    from server import get_current_user
    return await get_current_user(request)


# ==================== ENDPOINTS ====================

@bills_router.post("/bills", response_model=Bill)
async def create_bill(
    bill_data: BillCreate,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Create new bill."""
    user = await _get_user(request)
    bill_id = f"bill_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    bill = {
        "bill_id": bill_id,
        "user_id": user.user_id,
        "family_member_id": bill_data.family_member_id,
        "account_id": bill_data.account_id,
        "name": bill_data.name,
        "amount": bill_data.amount,
        "currency": bill_data.currency,
        "due_date": datetime.fromisoformat(bill_data.due_date.replace("Z", "+00:00")),
        "category": bill_data.category,
        "vendor": bill_data.vendor,
        "notes": bill_data.notes,
        "receipt_image": bill_data.receipt_image,
        "is_recurring": bill_data.is_recurring,
        "recurrence_type": bill_data.recurrence_type,
        "recurrence_interval": bill_data.recurrence_interval,
        "payment_status": "unpaid",
        "created_at": now,
        "updated_at": now,
    }
    await db.bills.insert_one(bill)
    bill.pop("_id", None)
    return Bill(**bill)


@bills_router.get("/bills", response_model=List[Bill])
async def get_bills(
    request: Request,
    authorization: Optional[str] = Header(None),
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
):
    """Get all bills for user with optional month/year/category/status filtering."""
    user = await _get_user(request)
    query = {"user_id": user.user_id}

    if month and year:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        query["due_date"] = {"$gte": start_date, "$lt": end_date}
    if category:
        query["category"] = category
    if status:
        query["payment_status"] = status

    bills = await db.bills.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return [Bill(**bill) for bill in bills]


@bills_router.get("/bills/summary")
async def bills_summary(request: Request):
    """Get bills bucketed by overdue / upcoming / paid status."""
    user = await _get_user(request)
    now = datetime.now(timezone.utc)
    all_bills = await db.bills.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("due_date", 1).to_list(1000)

    overdue, upcoming, paid_bills = [], [], []
    for b in all_bills:
        due = b.get("due_date")
        if isinstance(due, str):
            try:
                due = datetime.fromisoformat(due.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                due = None
        elif isinstance(due, datetime) and due.tzinfo is None:
            due = due.replace(tzinfo=timezone.utc)
        status = b.get("payment_status", b.get("status", "pending"))
        if status == "paid":
            paid_bills.append({**b, "bill_status": "paid"})
        elif due and due < now:
            overdue.append({**b, "bill_status": "overdue", "days_overdue": (now - due).days})
        else:
            days_until = (due - now).days if due else 999
            upcoming.append({**b, "bill_status": "upcoming", "days_until": days_until})

    return {
        "overdue": overdue, "overdue_count": len(overdue),
        "upcoming": upcoming, "upcoming_count": len(upcoming),
        "paid": paid_bills, "paid_count": len(paid_bills),
        "total_overdue_amount": sum(b.get("amount", 0) for b in overdue),
        "total_upcoming_amount": sum(b.get("amount", 0) for b in upcoming),
    }


@bills_router.get("/bills/{bill_id}", response_model=Bill)
async def get_bill(
    bill_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Get specific bill."""
    user = await _get_user(request)
    bill_doc = await db.bills.find_one(
        {"bill_id": bill_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not bill_doc:
        raise HTTPException(status_code=404, detail="Bill not found")
    return Bill(**bill_doc)


@bills_router.put("/bills/{bill_id}", response_model=Bill)
async def update_bill(
    bill_id: str,
    bill_data: BillUpdate,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Update bill."""
    user = await _get_user(request)
    existing = await db.bills.find_one({"bill_id": bill_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Bill not found")

    update_data = {
        k: v for k, v in bill_data.model_dump(exclude_unset=True).items() if v is not None
    }
    if "due_date" in update_data:
        update_data["due_date"] = datetime.fromisoformat(
            update_data["due_date"].replace("Z", "+00:00")
        )
    update_data["updated_at"] = datetime.now(timezone.utc)

    await db.bills.update_one(
        {"bill_id": bill_id, "user_id": user.user_id}, {"$set": update_data}
    )
    updated = await db.bills.find_one({"bill_id": bill_id}, {"_id": 0})
    return Bill(**updated)


@bills_router.delete("/bills/{bill_id}")
async def delete_bill(
    bill_id: str,
    request: Request,
    authorization: Optional[str] = Header(None),
):
    """Delete bill and any cascading payment records."""
    user = await _get_user(request)
    result = await db.bills.delete_one({"bill_id": bill_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    # Cascade delete associated payments
    await db.payments.delete_many({"bill_id": bill_id})
    return {"message": "Bill deleted successfully"}
