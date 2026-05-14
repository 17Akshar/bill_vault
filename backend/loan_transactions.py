"""
Loan Transactions Module
========================

Tracks every financial event tied to a loan:
  - EMI payments (with principal/interest breakdown)
  - Prepayment transactions (part or full)
  - Penalty/charges payments
  - Disbursement records

Collection: loan_transactions

Design principle: This is intentionally SEPARATE from the main income/expenses
collections. Loan transactions carry amortization metadata (principal_component,
interest_component, emi_number, balance_after) that have no meaning in general
transactions. Reusing the expenses collection would pollute it with loan-specific
fields and would require complex joins to reconstruct loan history.

Endpoints:
  POST  /api/loans/{loan_id}/transactions        Record a payment
  GET   /api/loans/{loan_id}/transactions        List transactions for a loan
  GET   /api/loan-transactions                   All transactions (all loans)
  PUT   /api/loan-transactions/{txn_id}          Correct a transaction (mutable: notes, reference_number)
  DELETE /api/loan-transactions/{txn_id}         Delete a transaction (reverses loan counters)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from firebase_config import db

loan_transactions_router = APIRouter(prefix="/api", tags=["loan_transactions"])


# ==================== MODELS ====================

class LoanTransactionCreate(BaseModel):
    transaction_type: Literal[
        "emi",             # regular monthly EMI payment
        "prepayment",      # part or full prepayment
        "interest_only",   # moratorium interest-only payment
        "charges",         # processing fee, late fee, etc.
        "disbursement",    # loan disbursement record (informational)
    ] = "emi"

    transaction_date: str                              # ISO datetime

    # Payment amounts
    amount: float = Field(..., gt=0)                   # total amount paid
    principal_component: Optional[float] = None        # auto-computed for EMI if None
    interest_component: Optional[float] = None         # auto-computed for EMI if None
    charges: Optional[float] = 0.0                    # late fee, processing charges

    # EMI reference
    emi_number: Optional[int] = None                   # 1-based EMI sequence number
    emi_reminder_id: Optional[str] = None              # FK to emi_reminders

    # Payment details
    payment_method: Optional[Literal[
        "auto_debit", "bank_transfer", "upi", "cheque", "cash", "other"
    ]] = None
    reference_number: Optional[str] = None             # UTR / cheque no

    notes: Optional[str] = None


class LoanTransactionUpdate(BaseModel):
    notes: Optional[str] = None
    reference_number: Optional[str] = None
    payment_method: Optional[str] = None


# ==================== AUTH HELPER ====================

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ==================== ENDPOINTS ====================

@loan_transactions_router.post("/loans/{loan_id}/transactions")
async def record_loan_transaction(
    loan_id: str, data: LoanTransactionCreate, request: Request
):
    """Record a payment against a loan and update outstanding balance + counters."""
    user = await _get_user(request)

    loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    txn_date = datetime.fromisoformat(data.transaction_date.replace("Z", "+00:00"))
    now = datetime.now(timezone.utc)

    outstanding_before = float(loan.get("outstanding_amount", 0))
    annual_rate = float(loan.get("interest_rate", 0))
    monthly_rate = annual_rate / 12 / 100

    # Auto-compute interest/principal split for EMI transactions
    principal_comp = data.principal_component
    interest_comp = data.interest_component

    if data.transaction_type == "emi" and (principal_comp is None or interest_comp is None):
        interest_type = loan.get("interest_type", "reducing_balance")
        if interest_type == "flat_rate":
            interest_comp = round(float(loan.get("principal_amount", outstanding_before)) * monthly_rate, 2)
        else:
            interest_comp = round(outstanding_before * monthly_rate, 2)
        principal_comp = round(data.amount - interest_comp - (data.charges or 0), 2)
        principal_comp = max(principal_comp, 0)

    elif data.transaction_type == "prepayment":
        interest_comp = interest_comp or 0.0
        principal_comp = round(data.amount - interest_comp - (data.charges or 0), 2)

    elif data.transaction_type in ("interest_only", "charges", "disbursement"):
        principal_comp = principal_comp or 0.0
        interest_comp = interest_comp or data.amount

    principal_comp = principal_comp or 0.0
    interest_comp = interest_comp or 0.0

    outstanding_after = round(max(outstanding_before - principal_comp, 0), 2)

    txn_id = f"ltxn_{uuid.uuid4().hex[:12]}"
    txn = {
        "loan_transaction_id": txn_id,
        "loan_id": loan_id,
        "user_id": user.user_id,

        "transaction_type": data.transaction_type,
        "transaction_date": txn_date,

        "amount": data.amount,
        "principal_component": principal_comp,
        "interest_component": interest_comp,
        "charges": data.charges or 0.0,

        "balance_before": outstanding_before,
        "balance_after": outstanding_after,

        "emi_number": data.emi_number,
        "emi_reminder_id": data.emi_reminder_id,

        "payment_method": data.payment_method,
        "reference_number": data.reference_number,

        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }

    await db.loan_transactions.insert_one(txn)

    # ── Update loan counters and outstanding balance ──
    loan_update: dict = {
        "outstanding_amount": outstanding_after,
        "updated_at": now,
    }

    if data.transaction_type in ("emi", "prepayment"):
        emis_paid = int(loan.get("emis_paid", 0))
        total_principal_paid = float(loan.get("total_principal_paid", 0))
        total_interest_paid = float(loan.get("total_interest_paid", 0))

        if data.transaction_type == "emi":
            emis_paid += 1
            loan_update["emis_paid"] = emis_paid

        loan_update["total_principal_paid"] = round(total_principal_paid + principal_comp, 2)
        loan_update["total_interest_paid"] = round(total_interest_paid + interest_comp, 2)

        # Update remaining tenure estimate
        remaining = int(loan.get("tenure_months", 0)) - emis_paid
        loan_update["remaining_tenure_months"] = max(remaining, 0)

        # Advance next_emi_date by one month if this was an EMI payment
        if data.transaction_type == "emi":
            next_emi = loan.get("next_emi_date")
            if next_emi:
                if isinstance(next_emi, str):
                    next_emi = datetime.fromisoformat(next_emi.replace("Z", "+00:00"))
                emi_day = int(loan.get("emi_day", next_emi.day))
                # Move to next month, same day
                next_month = next_emi.month % 12 + 1
                next_year = next_emi.year + (1 if next_emi.month == 12 else 0)
                next_day = min(emi_day, 28)
                loan_update["next_emi_date"] = datetime(
                    next_year, next_month, next_day, tzinfo=timezone.utc
                )

    await db.loans.update_one({"loan_id": loan_id}, {"$set": loan_update})

    txn.pop("_id", None)
    return txn


@loan_transactions_router.get("/loans/{loan_id}/transactions")
async def get_loan_transactions(
    loan_id: str,
    request: Request,
    transaction_type: Optional[str] = None,
):
    """List all transactions for a specific loan."""
    user = await _get_user(request)

    # Verify loan ownership
    loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    query: dict = {"loan_id": loan_id, "user_id": user.user_id}
    if transaction_type:
        query["transaction_type"] = transaction_type

    return await db.loan_transactions.find(query, {"_id": 0}).sort(
        "transaction_date", -1
    ).to_list(1000)


@loan_transactions_router.get("/loan-transactions")
async def get_all_loan_transactions(
    request: Request,
    transaction_type: Optional[str] = None,
    loan_id: Optional[str] = None,
):
    """Get all loan transactions across all loans for the current user."""
    user = await _get_user(request)
    query: dict = {"user_id": user.user_id}
    if loan_id:
        query["loan_id"] = loan_id
    if transaction_type:
        query["transaction_type"] = transaction_type

    return await db.loan_transactions.find(query, {"_id": 0}).sort(
        "transaction_date", -1
    ).to_list(2000)


@loan_transactions_router.put("/loan-transactions/{txn_id}")
async def update_loan_transaction(
    txn_id: str, data: LoanTransactionUpdate, request: Request
):
    """Update mutable fields on a transaction (notes, reference_number, payment_method)."""
    user = await _get_user(request)
    existing = await db.loan_transactions.find_one(
        {"loan_transaction_id": txn_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Transaction not found")

    update_data = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.loan_transactions.update_one(
        {"loan_transaction_id": txn_id}, {"$set": update_data}
    )
    return await db.loan_transactions.find_one(
        {"loan_transaction_id": txn_id}, {"_id": 0}
    )


@loan_transactions_router.delete("/loan-transactions/{txn_id}")
async def delete_loan_transaction(txn_id: str, request: Request):
    """Delete a transaction and reverse its effect on the loan's outstanding balance."""
    user = await _get_user(request)
    txn = await db.loan_transactions.find_one(
        {"loan_transaction_id": txn_id, "user_id": user.user_id}
    )
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Reverse the principal reduction on the parent loan
    loan_id = txn.get("loan_id")
    principal_comp = float(txn.get("principal_component", 0))
    interest_comp = float(txn.get("interest_component", 0))
    txn_type = txn.get("transaction_type")

    if loan_id and principal_comp > 0:
        loan = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
        if loan:
            reverse_update: dict = {
                "outstanding_amount": round(
                    float(loan.get("outstanding_amount", 0)) + principal_comp, 2
                ),
                "total_principal_paid": round(
                    max(float(loan.get("total_principal_paid", 0)) - principal_comp, 0), 2
                ),
                "total_interest_paid": round(
                    max(float(loan.get("total_interest_paid", 0)) - interest_comp, 0), 2
                ),
                "updated_at": datetime.now(timezone.utc),
            }
            if txn_type == "emi":
                reverse_update["emis_paid"] = max(int(loan.get("emis_paid", 0)) - 1, 0)
            await db.loans.update_one({"loan_id": loan_id}, {"$set": reverse_update})

    await db.loan_transactions.delete_one({"loan_transaction_id": txn_id})
    return {"message": "Transaction deleted and loan balance reversed"}
