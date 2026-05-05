"""
Loans Module
============

Extracted from server.py monolith during modularisation (Session 14).

Endpoints:
  POST   /api/loans              Create loan
  GET    /api/loans              List active loans
  PUT    /api/loans/{loan_id}    Update loan
  DELETE /api/loans/{loan_id}    Soft-delete loan
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from firebase_config import db

loans_router = APIRouter(prefix="/api", tags=["loans"])


class LoanCreate(BaseModel):
    name: str
    loan_type: str  # home, car, personal, education, gold, other
    principal_amount: float
    outstanding_amount: float
    interest_rate: float
    emi_amount: float
    tenure_months: int
    start_date: str
    next_emi_date: Optional[str] = None
    account_id: Optional[str] = None
    family_member_id: Optional[str] = None
    notes: Optional[str] = None


class LoanUpdate(BaseModel):
    name: Optional[str] = None
    outstanding_amount: Optional[float] = None
    emi_amount: Optional[float] = None
    next_emi_date: Optional[str] = None
    notes: Optional[str] = None


async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


@loans_router.post("/loans")
async def create_loan(data: LoanCreate, request: Request):
    user = await _get_user(request)
    loan_id = f"loan_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    loan = {
        "loan_id": loan_id, "user_id": user.user_id, "name": data.name,
        "loan_type": data.loan_type, "principal_amount": data.principal_amount,
        "outstanding_amount": data.outstanding_amount, "interest_rate": data.interest_rate,
        "emi_amount": data.emi_amount, "tenure_months": data.tenure_months,
        "start_date": datetime.fromisoformat(data.start_date.replace("Z", "+00:00")),
        "next_emi_date": (
            datetime.fromisoformat(data.next_emi_date.replace("Z", "+00:00"))
            if data.next_emi_date else None
        ),
        "account_id": data.account_id, "family_member_id": data.family_member_id,
        "notes": data.notes, "is_active": True, "created_at": now, "updated_at": now,
    }
    await db.loans.insert_one(loan)
    loan.pop("_id", None)
    return loan


@loans_router.get("/loans")
async def get_loans(request: Request):
    user = await _get_user(request)
    return await db.loans.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)


@loans_router.put("/loans/{loan_id}")
async def update_loan(loan_id: str, data: LoanUpdate, request: Request):
    user = await _get_user(request)
    existing = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Loan not found")
    update_data = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    if "next_emi_date" in update_data and isinstance(update_data["next_emi_date"], str):
        update_data["next_emi_date"] = datetime.fromisoformat(
            update_data["next_emi_date"].replace("Z", "+00:00")
        )
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.loans.update_one({"loan_id": loan_id}, {"$set": update_data})
    return await db.loans.find_one({"loan_id": loan_id}, {"_id": 0})


@loans_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, request: Request):
    user = await _get_user(request)
    existing = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db.loans.update_one(
        {"loan_id": loan_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Loan deactivated"}
