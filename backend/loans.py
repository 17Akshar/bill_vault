"""
Loans & EMIs Module (Enhanced)
================================
Endpoints:
  GET    /api/loans/dashboard             Summary stats
  POST   /api/loans                       Create loan
  GET    /api/loans                       List active loans
  GET    /api/loans/{loan_id}             Get loan detail
  PUT    /api/loans/{loan_id}             Update loan
  DELETE /api/loans/{loan_id}             Soft-delete
  POST   /api/loans/{loan_id}/prepayment  Record prepayment
  GET    /api/loans/{loan_id}/transactions  EMI + prepayment history
  POST   /api/loans/{loan_id}/transactions  Mark EMI paid

Schema
------
The authoritative shape of every document is defined in
`backend/models/loans.py` (LoanRecord / LoanTransactionRecord /
LoanPrepaymentRecord). EMI reminders REUSE the existing `reminders`
collection — see EMIReminderView in the same module.
"""
from __future__ import annotations

import uuid
import math
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from firebase_config import db

loans_router = APIRouter(prefix="/api", tags=["loans"])


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class LoanCreate(BaseModel):
    name: str
    loan_type: str                          # home, car, personal, education, gold, business, other
    lender: Optional[str] = None            # bank / lender name
    account_number: Optional[str] = None    # loan account number (optional)
    principal_amount: float
    outstanding_amount: Optional[float] = None  # defaults to principal_amount
    interest_rate: float
    interest_type: Optional[str] = "fixed"  # fixed or floating
    emi_amount: float
    emi_day: Optional[int] = None           # day of month (1-31)
    tenure_months: Optional[int] = None
    tenure_years: Optional[float] = None
    start_date: str                         # ISO string — date loan was taken
    next_emi_date: Optional[str] = None
    processing_fee: Optional[float] = 0.0
    other_charges: Optional[float] = 0.0
    linked_account_id: Optional[str] = None
    account_id: Optional[str] = None        # backward compat alias
    family_member_id: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = "active"        # active, closed, paused


class LoanUpdate(BaseModel):
    name: Optional[str] = None
    lender: Optional[str] = None
    outstanding_amount: Optional[float] = None
    emi_amount: Optional[float] = None
    emi_day: Optional[int] = None
    next_emi_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    interest_rate: Optional[float] = None
    interest_type: Optional[str] = None
    processing_fee: Optional[float] = None
    other_charges: Optional[float] = None


class PrepaymentCreate(BaseModel):
    amount: float
    date: str                               # ISO string
    prepayment_type: str = "reduce_tenure"  # reduce_tenure | reduce_emi
    notes: Optional[str] = None


class EMITransactionCreate(BaseModel):
    amount: float
    payment_date: str                       # ISO string
    payment_type: str = "emi"               # emi | prepayment
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _serialize_loan(loan: dict) -> dict:
    """Convert datetime fields to ISO strings for JSON response."""
    for k in [
        "start_date", "next_emi_date", "last_payment_date", "closed_date",
        "created_at", "updated_at",
    ]:
        v = loan.get(k)
        if v and isinstance(v, datetime):
            loan[k] = v.isoformat()
        elif v and hasattr(v, 'isoformat'):
            loan[k] = v.isoformat()
    loan.pop("_id", None)
    return loan


def _calc_remaining_months(principal: float, emi: float, monthly_rate: float) -> int:
    """Remaining months via standard amortisation formula."""
    if monthly_rate <= 0 or emi <= 0 or principal <= 0:
        return 0
    if emi <= principal * monthly_rate:
        return 999
    try:
        n = -math.log(1 - (principal * monthly_rate) / emi) / math.log(1 + monthly_rate)
        return max(0, round(n))
    except (ValueError, ZeroDivisionError):
        return 0


def _calc_emi(principal: float, monthly_rate: float, months: int) -> float:
    """Standard EMI formula."""
    if monthly_rate <= 0:
        return principal / months if months > 0 else 0.0
    r = monthly_rate
    n = months
    return principal * r * math.pow(1 + r, n) / (math.pow(1 + r, n) - 1)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@loans_router.get("/loans/dashboard")
async def get_loans_dashboard(request: Request):
    """Aggregate summary stats across all active loans."""
    user = await _get_user(request)
    loans = await db.loans.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).to_list(500)

    total_outstanding = sum(float(l.get("outstanding_amount") or 0) for l in loans)
    total_paid = sum(
        float(l.get("principal_amount") or 0) - float(l.get("outstanding_amount") or 0)
        for l in loans
    )
    monthly_emi = sum(float(l.get("emi_amount") or 0) for l in loans)

    total_interest = 0.0
    for l in loans:
        tm = l.get("tenure_months") or int((l.get("tenure_years") or 1) * 12)
        interest = float(l.get("emi_amount") or 0) * tm - float(l.get("principal_amount") or 0)
        total_interest += max(0.0, interest)

    return {
        "total_outstanding": round(total_outstanding, 2),
        "total_paid": round(max(0.0, total_paid), 2),
        "total_interest": round(total_interest, 2),
        "monthly_emi": round(monthly_emi, 2),
        "total_loans": len(loans),
        "active_loans": len([l for l in loans if l.get("status", "active") == "active"]),
    }


@loans_router.post("/loans")
async def create_loan(data: LoanCreate, request: Request):
    user = await _get_user(request)
    loan_id = f"loan_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    # Derive tenure_months from tenure_years if not provided
    tenure_months = data.tenure_months
    if not tenure_months and data.tenure_years:
        tenure_months = int(data.tenure_years * 12)
    if not tenure_months:
        tenure_months = 12

    outstanding = data.outstanding_amount if data.outstanding_amount is not None else data.principal_amount

    loan = {
        "loan_id": loan_id,
        "user_id": user.user_id,
        "name": data.name,
        "loan_type": data.loan_type,
        "lender": data.lender,
        "account_number": data.account_number,
        "principal_amount": data.principal_amount,
        "outstanding_amount": outstanding,
        "interest_rate": data.interest_rate,
        "interest_type": data.interest_type or "fixed",
        "emi_amount": data.emi_amount,
        "emi_day": data.emi_day,
        "tenure_months": tenure_months,
        "tenure_years": data.tenure_years,
        "start_date": datetime.fromisoformat(data.start_date.replace("Z", "+00:00")),
        "next_emi_date": (
            datetime.fromisoformat(data.next_emi_date.replace("Z", "+00:00"))
            if data.next_emi_date else None
        ),
        "processing_fee": data.processing_fee or 0.0,
        "other_charges": data.other_charges or 0.0,
        "linked_account_id": data.linked_account_id,
        "account_id": data.account_id,
        "family_member_id": data.family_member_id,
        "notes": data.notes,
        "status": data.status or "active",
        "is_active": True,
        # ── scalability tracking fields (kept in-sync by EMI / prepayment writes) ──
        "total_paid": 0.0,
        "total_principal_paid": 0.0,
        "total_interest_paid": 0.0,
        "last_payment_date": None,
        "closed_date": None,
        "created_at": now,
        "updated_at": now,
    }
    await db.loans.insert_one(loan)
    return _serialize_loan(loan)


@loans_router.get("/loans")
async def get_loans(request: Request):
    user = await _get_user(request)
    loans = await db.loans.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).sort("created_at", 1).to_list(200)
    return [_serialize_loan(l) for l in loans]


@loans_router.get("/loans/{loan_id}")
async def get_loan(loan_id: str, request: Request):
    user = await _get_user(request)
    loan = await db.loans.find_one(
        {"loan_id": loan_id, "user_id": user.user_id, "is_active": True}, {"_id": 0}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return _serialize_loan(loan)


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
    loan = await db.loans.find_one({"loan_id": loan_id}, {"_id": 0})
    return _serialize_loan(loan)


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


@loans_router.post("/loans/{loan_id}/prepayment")
async def add_prepayment(loan_id: str, data: PrepaymentCreate, request: Request):
    """Record a prepayment and update outstanding balance."""
    user = await _get_user(request)
    loan = await db.loans.find_one(
        {"loan_id": loan_id, "user_id": user.user_id, "is_active": True}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    current_outstanding = float(loan.get("outstanding_amount") or 0)
    emi = float(loan.get("emi_amount") or 0)
    rate = float(loan.get("interest_rate") or 0) / 100.0 / 12.0
    new_outstanding = max(0.0, current_outstanding - data.amount)

    interest_saved = 0.0
    remaining_months = 0
    new_emi = emi

    if rate > 0 and current_outstanding > 0 and emi > 0:
        old_months = _calc_remaining_months(current_outstanding, emi, rate)
        new_months = _calc_remaining_months(new_outstanding, emi, rate) if new_outstanding > 0 else 0

        if data.prepayment_type == "reduce_tenure":
            remaining_months = new_months
            old_total_cost = old_months * emi
            new_total_cost = new_months * emi
            interest_saved = max(0.0, (old_total_cost - current_outstanding) - (new_total_cost - new_outstanding))
        else:  # reduce_emi
            remaining_months = old_months
            if remaining_months > 0:
                new_emi = _calc_emi(new_outstanding, rate, remaining_months)
                old_total_cost = old_months * emi
                new_total_cost = remaining_months * new_emi
                interest_saved = max(0.0, (old_total_cost - current_outstanding) - (new_total_cost - new_outstanding))

    prepay_id = f"prepay_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    prepayment_doc = {
        "prepay_id": prepay_id,
        "loan_id": loan_id,
        "user_id": user.user_id,
        "amount": data.amount,
        "date": datetime.fromisoformat(data.date.replace("Z", "+00:00")),
        "prepayment_type": data.prepayment_type,
        "notes": data.notes,
        "interest_saved": round(interest_saved, 2),
        "new_outstanding": round(new_outstanding, 2),
        "remaining_months": remaining_months,
        "new_emi": round(new_emi, 2),
        "created_at": now,
    }
    await db.loan_prepayments.insert_one(prepayment_doc)

    update_fields = {
        "outstanding_amount": new_outstanding,
        "total_paid": round(float(loan.get("total_paid") or 0) + data.amount, 2),
        "updated_at": now,
    }
    if data.prepayment_type == "reduce_emi":
        update_fields["emi_amount"] = round(new_emi, 2)
    # Auto-close loan when fully repaid via prepayment
    if new_outstanding <= 0.0:
        update_fields["status"]      = "closed"
        update_fields["closed_date"] = now
    await db.loans.update_one({"loan_id": loan_id}, {"$set": update_fields})

    prepayment_doc.pop("_id", None)
    for k in ["date", "created_at"]:
        if prepayment_doc.get(k) and isinstance(prepayment_doc[k], datetime):
            prepayment_doc[k] = prepayment_doc[k].isoformat()

    return {
        "message": "Prepayment recorded",
        "prepayment": prepayment_doc,
        "new_outstanding": new_outstanding,
        "interest_saved": round(interest_saved, 2),
        "remaining_months": remaining_months,
        "new_emi": round(new_emi, 2),
    }


@loans_router.get("/loans/{loan_id}/transactions")
async def get_loan_transactions(loan_id: str, request: Request):
    """Return EMI payments + prepayments for a loan."""
    user = await _get_user(request)
    loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    txns = await db.loan_transactions.find(
        {"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0}
    ).sort("payment_date", -1).to_list(300)

    prepayments = await db.loan_prepayments.find(
        {"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0}
    ).sort("date", -1).to_list(300)

    for t in txns:
        t.pop("_id", None)
        for k in ["payment_date", "created_at"]:
            if t.get(k) and isinstance(t[k], datetime):
                t[k] = t[k].isoformat()

    for p in prepayments:
        p.pop("_id", None)
        for k in ["date", "created_at"]:
            if p.get(k) and isinstance(p[k], datetime):
                p[k] = p[k].isoformat()

    return {"transactions": txns, "prepayments": prepayments}


@loans_router.post("/loans/{loan_id}/transactions")
async def add_loan_transaction(loan_id: str, data: EMITransactionCreate, request: Request):
    """Mark an EMI as paid.

    Computes the principal / interest split server-side and persists it
    on the transaction row so clients never re-derive it. Also keeps the
    loan's aggregate tracking fields (`outstanding_amount`, `total_paid`,
    `total_principal_paid`, `total_interest_paid`, `last_payment_date`,
    `next_emi_date`, `status`, `closed_date`) in sync.
    """
    user = await _get_user(request)
    loan = await db.loans.find_one(
        {"loan_id": loan_id, "user_id": user.user_id, "is_active": True}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    # ── Compute principal / interest split ─────────────────────────────
    current_outstanding = float(loan.get("outstanding_amount") or 0)
    monthly_rate        = (float(loan.get("interest_rate") or 0) / 100.0) / 12.0
    amount              = float(data.amount)

    interest_paid  = max(0.0, min(amount, current_outstanding * monthly_rate))
    principal_paid = max(0.0, amount - interest_paid)
    # Cap principal at the remaining balance — payments cannot drive balance negative.
    principal_paid = min(principal_paid, current_outstanding)
    new_outstanding = max(0.0, current_outstanding - principal_paid)

    loan_txn_id = f"ltxn_{uuid.uuid4().hex[:10]}"
    now = datetime.now(timezone.utc)
    payment_date = datetime.fromisoformat(data.payment_date.replace("Z", "+00:00"))
    txn = {
        "loan_txn_id": loan_txn_id,
        "loan_id": loan_id,
        "user_id": user.user_id,
        "amount": round(amount, 2),
        "principal_paid": round(principal_paid, 2),
        "interest_paid":  round(interest_paid, 2),
        "outstanding_after": round(new_outstanding, 2),
        "payment_date": payment_date,
        "payment_type": data.payment_type,
        "notes": data.notes,
        "created_at": now,
    }
    await db.loan_transactions.insert_one(txn)

    # ── Update loan aggregates ─────────────────────────────────────────
    update_fields = {
        "outstanding_amount": round(new_outstanding, 2),
        "total_paid":           round(float(loan.get("total_paid") or 0) + amount, 2),
        "total_principal_paid": round(float(loan.get("total_principal_paid") or 0) + principal_paid, 2),
        "total_interest_paid":  round(float(loan.get("total_interest_paid")  or 0) + interest_paid, 2),
        "last_payment_date":    payment_date,
        "updated_at":           now,
    }
    # Roll next_emi_date forward to the same day next month
    next_emi = loan.get("next_emi_date")
    if next_emi:
        try:
            d = next_emi if isinstance(next_emi, datetime) else datetime.fromisoformat(
                str(next_emi).replace("Z", "+00:00")
            )
            try:
                from dateutil.relativedelta import relativedelta
                update_fields["next_emi_date"] = d + relativedelta(months=1)
            except Exception:
                from datetime import timedelta
                update_fields["next_emi_date"] = d + timedelta(days=30)
        except Exception:
            pass
    # Auto-close the loan when fully paid
    if new_outstanding <= 0.0:
        update_fields["status"]      = "closed"
        update_fields["closed_date"] = now

    await db.loans.update_one({"loan_id": loan_id}, {"$set": update_fields})

    txn.pop("_id", None)
    for k in ["payment_date", "created_at"]:
        if txn.get(k) and isinstance(txn[k], datetime):
            txn[k] = txn[k].isoformat()
    return txn
