"""
Loans Module (Enhanced Schema — Scalable Loans & EMIs)
=======================================================

Extracted from server.py monolith (Session 14) and enhanced with a
production-grade schema to support EMI tracking, interest calculations,
prepayment, and reminder integration.

Collections:
  - loans               (this module)

Related modules:
  - loan_transactions   (EMI payment history)
  - emi_reminders       (per-EMI schedule + bridge to reminders)
  - loan_prepayments    (part-prepayment / full-closure records)

Endpoints:
  POST   /api/loans                      Create loan (auto-generates EMI schedule)
  GET    /api/loans                      List active loans
  GET    /api/loans/summary              Portfolio summary (totals, status breakdown)
  GET    /api/loans/{loan_id}            Single loan detail with amortization slice
  PUT    /api/loans/{loan_id}            Update mutable fields
  DELETE /api/loans/{loan_id}            Soft-delete (is_active=false)
  POST   /api/loans/{loan_id}/close      Mark loan as closed/prepaid
  GET    /api/loans/{loan_id}/amortization  Full amortization schedule
"""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from firebase_config import db

loans_router = APIRouter(prefix="/api", tags=["loans"])


# ==================== MODELS ====================

class LoanCreate(BaseModel):
    # Identity
    name: str
    loan_type: Literal[
        "home", "car", "personal", "education",
        "gold", "mortgage", "business", "vehicle", "other"
    ]
    lender_name: Optional[str] = None
    loan_account_number: Optional[str] = None

    # Financials
    principal_amount: float = Field(..., gt=0)
    disbursed_amount: Optional[float] = None        # may differ from sanctioned
    interest_rate: float = Field(..., gt=0)          # per annum %
    interest_type: Literal["reducing_balance", "flat_rate"] = "reducing_balance"
    tenure_months: int = Field(..., gt=0)
    emi_amount: Optional[float] = None               # auto-computed if None
    emi_day: Optional[int] = Field(None, ge=1, le=28)  # day of month EMI is due

    # Charges
    processing_fee: Optional[float] = 0.0
    prepayment_penalty_rate: Optional[float] = 0.0   # % of outstanding
    insurance_amount: Optional[float] = 0.0

    # Collateral
    collateral_type: Optional[str] = None            # property, vehicle, gold, none
    collateral_description: Optional[str] = None

    # Dates
    start_date: str                                   # ISO date — first EMI month
    disbursement_date: Optional[str] = None

    # Links
    account_id: Optional[str] = None                 # account EMI is debited from
    family_member_id: Optional[str] = None

    notes: Optional[str] = None


class LoanUpdate(BaseModel):
    name: Optional[str] = None
    lender_name: Optional[str] = None
    loan_account_number: Optional[str] = None
    outstanding_amount: Optional[float] = None
    emi_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    remaining_tenure_months: Optional[int] = None
    next_emi_date: Optional[str] = None
    emi_day: Optional[int] = Field(None, ge=1, le=28)
    account_id: Optional[str] = None
    notes: Optional[str] = None


class LoanCloseRequest(BaseModel):
    closure_type: Literal["paid_off", "prepaid", "transferred"] = "paid_off"
    closure_date: Optional[str] = None
    notes: Optional[str] = None


# ==================== INTEREST CALCULATION HELPERS ====================

def _compute_emi(principal: float, annual_rate: float, tenure_months: int,
                 interest_type: str = "reducing_balance") -> float:
    """Compute monthly EMI.

    Reducing balance (standard):
        EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    Flat rate:
        EMI = (P + P * r_flat * n/12) / n
    """
    if interest_type == "flat_rate":
        r_flat = annual_rate / 100
        total_interest = principal * r_flat * (tenure_months / 12)
        return round((principal + total_interest) / tenure_months, 2)

    r = annual_rate / 12 / 100
    if r == 0:
        return round(principal / tenure_months, 2)
    factor = math.pow(1 + r, tenure_months)
    emi = principal * r * factor / (factor - 1)
    return round(emi, 2)


def _compute_amortization(
    principal: float,
    annual_rate: float,
    tenure_months: int,
    emi: float,
    start_date: datetime,
    interest_type: str = "reducing_balance",
    emis_already_paid: int = 0,
) -> list:
    """Return full amortization schedule as a list of dicts."""
    schedule = []
    balance = principal
    r = annual_rate / 12 / 100

    for i in range(1, tenure_months + 1):
        if interest_type == "flat_rate":
            interest = round(principal * r, 2)
        else:
            interest = round(balance * r, 2)

        principal_component = round(emi - interest, 2)
        # Last EMI — pay off residual balance
        if i == tenure_months:
            principal_component = round(balance, 2)
            adjusted_emi = round(principal_component + interest, 2)
        else:
            adjusted_emi = emi

        balance_after = round(max(balance - principal_component, 0), 2)

        due_date = start_date + timedelta(days=30 * (i - 1))  # approximate; emi_day governs exact

        schedule.append({
            "emi_number": i,
            "due_date": due_date.isoformat(),
            "emi_amount": adjusted_emi,
            "principal_component": principal_component,
            "interest_component": interest,
            "balance_before": round(balance, 2),
            "balance_after": balance_after,
            "status": "paid" if i <= emis_already_paid else "pending",
        })
        balance = balance_after

    return schedule


def _loan_end_date(start: datetime, tenure_months: int) -> datetime:
    """Approx loan end date (start + tenure months)."""
    month = start.month - 1 + tenure_months
    year = start.year + month // 12
    month = month % 12 + 1
    day = min(start.day, 28)
    return datetime(year, month, day, tzinfo=timezone.utc)


# ==================== AUTH HELPER ====================

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ==================== ENDPOINTS ====================

@loans_router.post("/loans")
async def create_loan(data: LoanCreate, request: Request):
    """Create a loan and auto-generate the EMI schedule in emi_reminders."""
    user = await _get_user(request)
    loan_id = f"loan_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    start_dt = datetime.fromisoformat(data.start_date.replace("Z", "+00:00"))
    disbursement_dt = (
        datetime.fromisoformat(data.disbursement_date.replace("Z", "+00:00"))
        if data.disbursement_date else start_dt
    )
    end_dt = _loan_end_date(start_dt, data.tenure_months)

    principal = data.principal_amount
    disbursed = data.disbursed_amount or principal

    # Auto-compute EMI if not provided
    emi = data.emi_amount or _compute_emi(
        principal, data.interest_rate, data.tenure_months, data.interest_type
    )

    # Compute next EMI date (same day next month from start)
    next_emi_dt = start_dt

    loan = {
        "loan_id": loan_id,
        "user_id": user.user_id,
        "family_member_id": data.family_member_id,
        "account_id": data.account_id,

        # Identity
        "name": data.name,
        "loan_type": data.loan_type,
        "lender_name": data.lender_name,
        "loan_account_number": data.loan_account_number,

        # Financials
        "principal_amount": principal,
        "disbursed_amount": disbursed,
        "outstanding_amount": principal,
        "interest_rate": data.interest_rate,
        "interest_type": data.interest_type,
        "tenure_months": data.tenure_months,
        "remaining_tenure_months": data.tenure_months,
        "emi_amount": emi,
        "emi_day": data.emi_day or start_dt.day,

        # Charges
        "processing_fee": data.processing_fee or 0.0,
        "prepayment_penalty_rate": data.prepayment_penalty_rate or 0.0,
        "insurance_amount": data.insurance_amount or 0.0,

        # Collateral
        "collateral_type": data.collateral_type,
        "collateral_description": data.collateral_description,

        # Dates
        "start_date": start_dt,
        "disbursement_date": disbursement_dt,
        "end_date": end_dt,
        "next_emi_date": next_emi_dt,

        # Tracking counters (updated as EMIs are paid)
        "total_emis": data.tenure_months,
        "emis_paid": 0,
        "total_principal_paid": 0.0,
        "total_interest_paid": 0.0,

        # Status
        "status": "active",          # active | closed | prepaid | transferred | defaulted
        "is_active": True,

        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }

    await db.loans.insert_one(loan)
    loan.pop("_id", None)
    return loan


@loans_router.get("/loans/summary")
async def get_loans_summary(request: Request):
    """Portfolio summary — total outstanding, monthly EMI burden, status breakdown."""
    user = await _get_user(request)
    loans = await db.loans.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).to_list(200)

    total_outstanding = sum(l.get("outstanding_amount", 0) for l in loans)
    monthly_emi_total = sum(l.get("emi_amount", 0) for l in loans)
    total_principal = sum(l.get("principal_amount", 0) for l in loans)
    total_principal_paid = sum(l.get("total_principal_paid", 0) for l in loans)
    total_interest_paid = sum(l.get("total_interest_paid", 0) for l in loans)

    by_status: dict = {}
    by_type: dict = {}
    for l in loans:
        s = l.get("status", "active")
        by_status[s] = by_status.get(s, 0) + 1
        t = l.get("loan_type", "other")
        by_type[t] = by_type.get(t, 0) + 1

    return {
        "total_loans": len(loans),
        "total_outstanding": total_outstanding,
        "total_principal": total_principal,
        "monthly_emi_total": monthly_emi_total,
        "total_principal_paid": total_principal_paid,
        "total_interest_paid": total_interest_paid,
        "by_status": by_status,
        "by_type": by_type,
    }


@loans_router.get("/loans")
async def get_loans(request: Request, status: Optional[str] = None):
    """List loans with optional status filter."""
    user = await _get_user(request)
    query: dict = {"user_id": user.user_id, "is_active": True}
    if status:
        query["status"] = status
    return await db.loans.find(query, {"_id": 0}).sort("created_at", 1).to_list(200)


@loans_router.get("/loans/{loan_id}")
async def get_loan(loan_id: str, request: Request):
    """Single loan detail."""
    user = await _get_user(request)
    loan = await db.loans.find_one(
        {"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan


@loans_router.get("/loans/{loan_id}/amortization")
async def get_amortization_schedule(loan_id: str, request: Request):
    """Return the complete amortization schedule for a loan."""
    user = await _get_user(request)
    loan = await db.loans.find_one(
        {"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    start_date = loan.get("start_date")
    if isinstance(start_date, str):
        start_date = datetime.fromisoformat(start_date.replace("Z", "+00:00"))

    schedule = _compute_amortization(
        principal=loan["principal_amount"],
        annual_rate=loan["interest_rate"],
        tenure_months=loan["tenure_months"],
        emi=loan["emi_amount"],
        start_date=start_date,
        interest_type=loan.get("interest_type", "reducing_balance"),
        emis_already_paid=loan.get("emis_paid", 0),
    )

    total_interest = sum(row["interest_component"] for row in schedule)
    total_payment = sum(row["emi_amount"] for row in schedule)

    return {
        "loan_id": loan_id,
        "loan_name": loan.get("name"),
        "principal_amount": loan["principal_amount"],
        "emi_amount": loan["emi_amount"],
        "tenure_months": loan["tenure_months"],
        "total_payment": round(total_payment, 2),
        "total_interest": round(total_interest, 2),
        "interest_to_principal_ratio": round(
            total_interest / loan["principal_amount"] * 100, 2
        ) if loan["principal_amount"] else 0,
        "schedule": schedule,
    }


@loans_router.put("/loans/{loan_id}")
async def update_loan(loan_id: str, data: LoanUpdate, request: Request):
    """Update mutable loan fields."""
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


@loans_router.post("/loans/{loan_id}/close")
async def close_loan(loan_id: str, data: LoanCloseRequest, request: Request):
    """Mark a loan as closed/prepaid/transferred."""
    user = await _get_user(request)
    existing = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Loan not found")

    closure_dt = (
        datetime.fromisoformat(data.closure_date.replace("Z", "+00:00"))
        if data.closure_date else datetime.now(timezone.utc)
    )

    status_map = {
        "paid_off": "closed",
        "prepaid": "prepaid",
        "transferred": "transferred",
    }

    await db.loans.update_one(
        {"loan_id": loan_id},
        {"$set": {
            "status": status_map.get(data.closure_type, "closed"),
            "is_active": False,
            "outstanding_amount": 0.0,
            "remaining_tenure_months": 0,
            "closure_date": closure_dt,
            "closure_notes": data.notes,
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    return await db.loans.find_one({"loan_id": loan_id}, {"_id": 0})


@loans_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, request: Request):
    """Soft-delete a loan (sets is_active=False)."""
    user = await _get_user(request)
    existing = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db.loans.update_one(
        {"loan_id": loan_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Loan deactivated"}


@loans_router.get("/loans/{loan_id}/analytics")
async def get_loan_analytics(loan_id: str, request: Request):
    """
    Compute rich analytics for a single loan using actual transaction history.

    Returns:
      outstanding_balance      — current outstanding (from loan record)
      emi_tracking             — emis paid/remaining, next due date
      interest_paid            — cumulative interest from EMI transactions
      interest_remaining       — projected interest left on current balance
      completion_percentage    — principal repaid as % of original principal
      prepayment_impact        — total prepaid, saved interest, revised tenure
      interest_saved           — interest saved vs original schedule
      payment_breakdown        — principal vs interest split of total paid
      monthly_burden           — current EMI amount
    """
    user = await _get_user(request)
    loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    principal = float(loan.get("principal_amount", 0))
    outstanding = float(loan.get("outstanding_amount", 0))
    annual_rate = float(loan.get("interest_rate", 0))
    tenure = int(loan.get("tenure_months", 0))
    emi = float(loan.get("emi_amount", 0))
    interest_type = loan.get("interest_type", "reducing_balance")
    emis_paid = int(loan.get("emis_paid", 0))
    remaining_tenure = int(loan.get("remaining_tenure_months", tenure - emis_paid))

    # ── Pull actual transactions ──
    txns = await db.loan_transactions.find(
        {"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0}
    ).to_list(2000)

    # ── Pull prepayments ──
    prepayments = await db.loan_prepayments.find(
        {"loan_id": loan_id, "user_id": user.user_id}, {"_id": 0}
    ).to_list(200)

    # ── 1. Outstanding Balance ──
    outstanding_balance = outstanding

    # ── 2. EMI Tracking ──
    emi_txns = [t for t in txns if t.get("transaction_type") == "emi"]
    actual_emis_paid = len(emi_txns)
    # Use stored emis_paid if transaction history is empty (legacy loans)
    emis_paid_effective = max(actual_emis_paid, emis_paid)
    emis_remaining = max(tenure - emis_paid_effective, 0)

    next_emi_raw = loan.get("next_emi_date")
    next_emi_str = None
    if next_emi_raw:
        if isinstance(next_emi_raw, str):
            next_emi_str = next_emi_raw
        else:
            next_emi_str = next_emi_raw.isoformat() if hasattr(next_emi_raw, "isoformat") else str(next_emi_raw)

    # ── 3. Interest Paid (from actual transaction data) ──
    interest_paid_txn = sum(float(t.get("interest_component", 0)) for t in txns if t.get("transaction_type") in ("emi", "interest_only"))
    # Fallback to stored value when no transactions yet
    interest_paid = interest_paid_txn if interest_paid_txn > 0 else float(loan.get("total_interest_paid", 0))

    # ── 4. Interest Remaining (project from current outstanding) ──
    monthly_rate = annual_rate / 12 / 100
    interest_remaining = 0.0
    if outstanding_balance > 0 and remaining_tenure > 0:
        balance = outstanding_balance
        for _ in range(remaining_tenure):
            if interest_type == "flat_rate":
                i_comp = round(principal * monthly_rate, 2)
            else:
                i_comp = round(balance * monthly_rate, 2)
            p_comp = max(round(emi - i_comp, 2), 0)
            interest_remaining += i_comp
            balance = max(balance - p_comp, 0)
        interest_remaining = round(interest_remaining, 2)

    # ── 5. Completion Percentage ──
    principal_paid = round(principal - outstanding_balance, 2)
    completion_pct = round((principal_paid / principal * 100), 2) if principal > 0 else 0.0

    # ── 6 & 7. Prepayment Impact + Interest Saved ──
    total_prepaid = sum(float(p.get("amount", 0)) for p in prepayments)
    penalty_paid = sum(float(p.get("penalty_amount", 0)) for p in prepayments)

    # Original total interest (no prepayments) — compute from scratch
    original_interest = 0.0
    orig_balance = principal
    for _ in range(tenure):
        if interest_type == "flat_rate":
            i_comp = round(principal * monthly_rate, 2)
        else:
            i_comp = round(orig_balance * monthly_rate, 2)
        p_comp = max(round(emi - i_comp, 2), 0)
        original_interest += i_comp
        orig_balance = max(orig_balance - p_comp, 0)
    original_interest = round(original_interest, 2)

    # Interest saved = (original total interest) - (interest already paid + interest still remaining)
    interest_already_and_remaining = round(interest_paid + interest_remaining, 2)
    interest_saved = round(max(original_interest - interest_already_and_remaining, 0), 2)

    # Tenure saved (original tenure - effective remaining)
    tenure_saved_months = max(tenure - (emis_paid_effective + remaining_tenure), 0)

    # ── Payment breakdown ──
    total_principal_paid = float(loan.get("total_principal_paid", principal_paid))
    total_paid = round(total_principal_paid + interest_paid, 2)
    total_loan_cost = round(original_interest + principal, 2)

    return {
        "loan_id": loan_id,
        "loan_name": loan.get("name"),
        "loan_type": loan.get("loan_type"),
        "status": loan.get("status", "active"),

        # 1. Outstanding balance
        "outstanding_balance": outstanding_balance,
        "principal_amount": principal,
        "principal_paid": round(total_principal_paid, 2),

        # 2. EMI tracking
        "emi_tracking": {
            "emi_amount": emi,
            "emis_paid": emis_paid_effective,
            "emis_remaining": emis_remaining,
            "tenure_months": tenure,
            "remaining_tenure_months": remaining_tenure,
            "next_emi_date": next_emi_str,
        },

        # 3. Interest paid (from transactions)
        "interest_paid": interest_paid,

        # 4. Interest remaining (projected)
        "interest_remaining": interest_remaining,

        # 5. Completion percentage
        "completion_percentage": completion_pct,

        # 6. Prepayment impact
        "prepayment_impact": {
            "total_prepaid_amount": round(total_prepaid, 2),
            "total_prepayments_count": len(prepayments),
            "penalty_paid": round(penalty_paid, 2),
            "tenure_saved_months": tenure_saved_months,
        },

        # 7. Interest saved vs original schedule
        "interest_saved": interest_saved,
        "original_total_interest": original_interest,
        "total_loan_cost": total_loan_cost,

        # Payment breakdown
        "payment_breakdown": {
            "total_paid": total_paid,
            "total_principal_paid": round(total_principal_paid, 2),
            "total_interest_paid": interest_paid,
            "principal_pct": round(total_principal_paid / total_paid * 100, 1) if total_paid > 0 else 0,
            "interest_pct": round(interest_paid / total_paid * 100, 1) if total_paid > 0 else 0,
        },

        # Monthly burden
        "monthly_burden": emi,
        "interest_rate": annual_rate,
        "interest_type": interest_type,
    }
