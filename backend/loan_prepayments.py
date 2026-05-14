"""
Loan Prepayments Module
=======================

Tracks full-closure and part-prepayment payments made against a loan
outside the regular EMI schedule.

Collection: loan_prepayments

Design:
  Prepayments are financially distinct from regular EMI transactions:
    - They reduce outstanding principal significantly in one shot
    - They change the loan terms (reduce either tenure or EMI amount)
    - They may attract a penalty fee
    - The bank issues a fresh repayment schedule after a prepayment

  This module:
    1. Records the prepayment event with full audit fields
    2. Computes the new outstanding amount and optional revised EMI / tenure
    3. Updates the parent loan document accordingly
    4. Does NOT create an entry in the generic income/expenses tables (per spec)

Endpoints:
  POST  /api/loans/{loan_id}/prepayments          Record a prepayment
  GET   /api/loans/{loan_id}/prepayments          List prepayments for a loan
  GET   /api/loan-prepayments                     All prepayments across all loans
  GET   /api/loan-prepayments/{prepayment_id}     Single prepayment detail
  PUT   /api/loan-prepayments/{prepayment_id}     Correct notes / reference
  DELETE /api/loan-prepayments/{prepayment_id}    Delete and reverse loan update
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone
from typing import Optional, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from firebase_config import db

loan_prepayments_router = APIRouter(prefix="/api", tags=["loan_prepayments"])


# ==================== MODELS ====================

class LoanPrepaymentCreate(BaseModel):
    payment_date: str                                      # ISO datetime
    amount: float = Field(..., gt=0)                       # prepayment principal amount

    prepayment_type: Literal[
        "part_prepayment",   # partial reduction — loan continues
        "full_closure",      # complete payoff
    ] = "part_prepayment"

    # Penalty
    penalty_rate: Optional[float] = Field(0.0, ge=0)      # % of prepaid amount
    # penalty_amount is auto-computed from amount * penalty_rate / 100

    # Post-prepayment loan adjustment (only relevant for part_prepayment)
    adjustment_type: Optional[Literal["reduce_tenure", "reduce_emi"]] = "reduce_tenure"

    # Payment details
    payment_method: Optional[Literal[
        "bank_transfer", "upi", "cheque", "demand_draft", "cash", "other"
    ]] = None
    reference_number: Optional[str] = None

    notes: Optional[str] = None


class LoanPrepaymentUpdate(BaseModel):
    notes: Optional[str] = None
    reference_number: Optional[str] = None
    payment_method: Optional[str] = None


# ==================== AUTH HELPER ====================

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ==================== INTEREST CALCULATION HELPERS ====================

def _revised_emi(
    outstanding: float, annual_rate: float, remaining_months: int
) -> float:
    """Compute revised EMI after prepayment (reducing balance)."""
    r = annual_rate / 12 / 100
    if r == 0 or remaining_months <= 0:
        return round(outstanding / max(remaining_months, 1), 2)
    factor = math.pow(1 + r, remaining_months)
    return round(outstanding * r * factor / (factor - 1), 2)


def _revised_tenure(
    outstanding: float, annual_rate: float, current_emi: float
) -> int:
    """Compute revised tenure (months) after prepayment, keeping same EMI."""
    r = annual_rate / 12 / 100
    if r == 0 or current_emi <= 0:
        return max(int(math.ceil(outstanding / current_emi)), 1)
    if current_emi <= outstanding * r:
        # EMI doesn't even cover interest — return max safe tenure
        return 360
    n = -math.log(1 - outstanding * r / current_emi) / math.log(1 + r)
    return max(int(math.ceil(n)), 1)


# ==================== ENDPOINTS ====================

@loan_prepayments_router.post("/loans/{loan_id}/prepayments")
async def record_prepayment(
    loan_id: str, data: LoanPrepaymentCreate, request: Request
):
    """Record a prepayment and update the loan's outstanding amount and terms."""
    user = await _get_user(request)
    loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if loan.get("status") in ("closed", "prepaid", "transferred"):
        raise HTTPException(
            status_code=400, detail=f"Loan is already {loan['status']}"
        )

    payment_dt = datetime.fromisoformat(data.payment_date.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)

    outstanding_before = float(loan.get("outstanding_amount", 0))
    annual_rate = float(loan.get("interest_rate", 0))
    remaining_months = int(loan.get("remaining_tenure_months", loan.get("tenure_months", 0)))
    current_emi = float(loan.get("emi_amount", 0))

    # Penalty calculation
    penalty_rate = float(data.penalty_rate or loan.get("prepayment_penalty_rate", 0))
    penalty_amount = round(data.amount * penalty_rate / 100, 2)
    total_amount_paid = round(data.amount + penalty_amount, 2)

    # New outstanding (can't go below zero)
    outstanding_after = round(max(outstanding_before - data.amount, 0), 2)

    # Compute revised terms
    new_emi: Optional[float] = None
    new_tenure: Optional[int] = None

    if data.prepayment_type == "full_closure":
        outstanding_after = 0.0
        new_emi = 0.0
        new_tenure = 0
    elif outstanding_after > 0 and data.adjustment_type:
        if data.adjustment_type == "reduce_emi":
            new_emi = _revised_emi(outstanding_after, annual_rate, remaining_months)
            new_tenure = remaining_months
        else:  # reduce_tenure (default)
            new_tenure = _revised_tenure(outstanding_after, annual_rate, current_emi)
            new_emi = current_emi

    prepayment_id = f"lpp_{uuid.uuid4().hex[:12]}"
    prepayment = {
        "prepayment_id": prepayment_id,
        "loan_id": loan_id,
        "user_id": user.user_id,

        "payment_date": payment_dt,
        "amount": data.amount,
        "prepayment_type": data.prepayment_type,

        # Penalty
        "penalty_rate": penalty_rate,
        "penalty_amount": penalty_amount,
        "total_amount_paid": total_amount_paid,

        # Balance before/after
        "outstanding_before": outstanding_before,
        "outstanding_after": outstanding_after,

        # Revised loan terms (if applicable)
        "adjustment_type": data.adjustment_type,
        "new_emi_amount": new_emi,
        "new_tenure_months": new_tenure,

        # Payment details
        "payment_method": data.payment_method,
        "reference_number": data.reference_number,

        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }

    await db.loan_prepayments.insert_one(prepayment)

    # ── Update parent loan ──
    loan_update: dict = {
        "outstanding_amount": outstanding_after,
        "total_principal_paid": round(
            float(loan.get("total_principal_paid", 0)) + data.amount, 2
        ),
        "updated_at": now,
    }

    if data.prepayment_type == "full_closure":
        loan_update["status"] = "prepaid"
        loan_update["is_active"] = False
        loan_update["remaining_tenure_months"] = 0
        loan_update["emi_amount"] = 0.0
    else:
        if new_emi is not None:
            loan_update["emi_amount"] = new_emi
        if new_tenure is not None:
            loan_update["remaining_tenure_months"] = new_tenure

    await db.loans.update_one({"loan_id": loan_id}, {"$set": loan_update})

    prepayment.pop("_id", None)
    return prepayment


@loan_prepayments_router.get("/loans/{loan_id}/prepayments")
async def get_loan_prepayments(loan_id: str, request: Request):
    """List all prepayments for a specific loan."""
    user = await _get_user(request)
    loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    return await db.loan_prepayments.find(
        {"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0}
    ).sort("payment_date", -1).to_list(200)


@loan_prepayments_router.get("/loan-prepayments")
async def get_all_prepayments(
    request: Request, loan_id: Optional[str] = None
):
    """All prepayments across all loans for the current user."""
    user = await _get_user(request)
    query: dict = {"user_id": user.user_id}
    if loan_id:
        query["loan_id"] = loan_id

    return await db.loan_prepayments.find(query, {"_id": 0}).sort(
        "payment_date", -1
    ).to_list(1000)


@loan_prepayments_router.get("/loan-prepayments/{prepayment_id}")
async def get_prepayment(prepayment_id: str, request: Request):
    """Get a single prepayment record."""
    user = await _get_user(request)
    record = await db.loan_prepayments.find_one(
        {"prepayment_id": prepayment_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=404, detail="Prepayment not found")
    return record


@loan_prepayments_router.put("/loan-prepayments/{prepayment_id}")
async def update_prepayment(
    prepayment_id: str, data: LoanPrepaymentUpdate, request: Request
):
    """Update mutable fields on a prepayment (notes, reference_number, payment_method)."""
    user = await _get_user(request)
    existing = await db.loan_prepayments.find_one(
        {"prepayment_id": prepayment_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Prepayment not found")

    update_data = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.loan_prepayments.update_one(
        {"prepayment_id": prepayment_id}, {"$set": update_data}
    )
    return await db.loan_prepayments.find_one(
        {"prepayment_id": prepayment_id}, {"_id": 0}
    )


@loan_prepayments_router.delete("/loan-prepayments/{prepayment_id}")
async def delete_prepayment(prepayment_id: str, request: Request):
    """Delete a prepayment record and reverse the outstanding amount on the loan."""
    user = await _get_user(request)
    record = await db.loan_prepayments.find_one(
        {"prepayment_id": prepayment_id, "user_id": user.user_id}
    )
    if not record:
        raise HTTPException(status_code=404, detail="Prepayment not found")

    loan_id = record.get("loan_id")
    amount = float(record.get("amount", 0))

    if loan_id and amount > 0:
        loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
        if loan:
            await db.loans.update_one(
                {"loan_id": loan_id},
                {"$set": {
                    "outstanding_amount": round(
                        float(loan.get("outstanding_amount", 0)) + amount, 2
                    ),
                    "total_principal_paid": round(
                        max(float(loan.get("total_principal_paid", 0)) - amount, 0), 2
                    ),
                    # Restore active status if the deleted record was a full_closure
                    **({"status": "active", "is_active": True}
                       if record.get("prepayment_type") == "full_closure" else {}),
                    "updated_at": datetime.now(timezone.utc),
                }},
            )

    await db.loan_prepayments.delete_one({"prepayment_id": prepayment_id})
    return {"message": "Prepayment deleted and loan balance reversed"}
