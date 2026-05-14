"""
Loans & EMIs — Authoritative Database Schema
=============================================

Pydantic models that define the canonical shape of every document stored
in the Loans & EMIs collections. These models are the single source of
truth for fields, types, defaults and validation across the backend.

Collections
-----------
| Collection         | Doc-id field    | Purpose                            |
|--------------------|-----------------|------------------------------------|
| loans              | loan_id         | One loan per row                   |
| loan_transactions  | loan_txn_id     | Each EMI / partial-payment row     |
| loan_prepayments   | prepay_id       | Each prepayment row                |
| reminders          | reminder_id     | REUSED for EMI reminders           |
| users              | user_id         | REUSED, NOT duplicated             |

Reuse
-----
- **Authentication**: every row carries `user_id`; auth check uses the
  existing `get_current_user()` from server.py.
- **Reminders**: EMI reminders are stored in the existing `reminders`
  collection with `reminder_type='loan_emi'` and `related_id=<loan_id>`.
  We do NOT introduce a separate `emi_reminders` collection.
- **Notifications**: `scheduleReminderNotifications()` from
  utils/reminderNotifications is reused as-is.

Not duplicated
--------------
- **Transactions / Income / Expense** modules — loan EMI rows live in
  their own `loan_transactions` collection. They never leak into the
  generic `transactions` collection.
- **Users** — single `users` collection; loans reference it by `user_id`.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


# ───────────────────────────────────────────────────────────────────────────
# Enums (kept as Literal aliases for portability across Pydantic versions)
# ───────────────────────────────────────────────────────────────────────────

LoanType   = Literal[
    "home", "car", "personal", "education", "gold",
    "business", "property", "vehicle", "other",
]
LoanStatus = Literal["active", "paused", "closed"]
InterestType = Literal["fixed", "floating"]
PrepaymentType = Literal["reduce_tenure", "reduce_emi"]
PaymentType = Literal["emi", "partial", "prepayment"]


# ───────────────────────────────────────────────────────────────────────────
# Loan
# ───────────────────────────────────────────────────────────────────────────

class LoanRecord(BaseModel):
    """Canonical shape of a `loans` document."""
    # ── identity / ownership ────────────────────────────────────────────
    loan_id: str
    user_id: str

    # ── loan details ────────────────────────────────────────────────────
    name: str
    loan_type: LoanType = "other"
    lender: Optional[str] = None
    account_number: Optional[str] = None

    # ── financial ───────────────────────────────────────────────────────
    principal_amount: float
    outstanding_amount: float
    interest_rate: float                                  # % per annum
    interest_type: InterestType = "fixed"
    emi_amount: float
    emi_day: Optional[int] = None                         # 1-31
    tenure_months: Optional[int] = None
    tenure_years: Optional[float] = None
    processing_fee: float = 0.0
    other_charges: float = 0.0

    # ── tracking (scalability fields) ───────────────────────────────────
    total_paid: float = 0.0                               # sum of all EMIs + prepayments
    total_principal_paid: float = 0.0
    total_interest_paid: float = 0.0
    last_payment_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None

    # ── dates ───────────────────────────────────────────────────────────
    start_date: datetime
    next_emi_date: Optional[datetime] = None

    # ── relationships (NOT FK to transactions; just references) ─────────
    linked_account_id: Optional[str] = None
    account_id: Optional[str] = None                      # backward-compat alias
    family_member_id: Optional[str] = None

    # ── misc ────────────────────────────────────────────────────────────
    notes: Optional[str] = None
    status: LoanStatus = "active"
    is_active: bool = True                                # soft-delete flag

    # ── audit ───────────────────────────────────────────────────────────
    created_at: datetime
    updated_at: datetime


# ───────────────────────────────────────────────────────────────────────────
# Loan Transaction (EMI payment)
# ───────────────────────────────────────────────────────────────────────────

class LoanTransactionRecord(BaseModel):
    """Canonical shape of a `loan_transactions` document.

    Stores the SERVER-COMPUTED principal / interest split so clients
    never have to re-derive it (and so the math is consistent across
    web, mobile, and reports).
    """
    loan_txn_id: str
    loan_id: str                                          # FK → loans.loan_id
    user_id: str                                          # auth scope

    amount: float
    principal_paid: float                                 # computed server-side
    interest_paid: float                                  # computed server-side
    outstanding_after: float                              # running balance after this txn
    payment_date: datetime
    payment_type: PaymentType = "emi"
    notes: Optional[str] = None

    created_at: datetime


# ───────────────────────────────────────────────────────────────────────────
# Loan Prepayment
# ───────────────────────────────────────────────────────────────────────────

class LoanPrepaymentRecord(BaseModel):
    """Canonical shape of a `loan_prepayments` document."""
    prepay_id: str
    loan_id: str                                          # FK → loans.loan_id
    user_id: str

    amount: float
    date: datetime
    prepayment_type: PrepaymentType = "reduce_tenure"

    # ── server-computed impact at the time of prepayment ────────────────
    new_outstanding: float
    new_emi: float
    remaining_months: int
    interest_saved: float

    notes: Optional[str] = None
    created_at: datetime


# ───────────────────────────────────────────────────────────────────────────
# EMI Reminder (REUSES the `reminders` collection — no new table)
# ───────────────────────────────────────────────────────────────────────────

class EMIReminderView(BaseModel):
    """View-only schema describing how an EMI reminder is stored inside
    the EXISTING `reminders` collection. We do NOT create a separate
    collection — we just constrain the field values when the reminder
    is loan-related.
    """
    reminder_id: str
    user_id: str
    title: str                                            # e.g. "EMI Due — Home Loan"
    description: Optional[str] = None

    reminder_type: Literal["loan_emi"]                    # discriminator
    related_id: Optional[str] = None                      # FK → loans.loan_id

    reminder_date: datetime                               # date + time combined
    is_recurring: bool = False
    recurrence: Optional[Literal["none", "daily", "weekly", "monthly"]] = None
    end_type: Optional[Literal["never", "on", "after"]] = "never"
    end_date: Optional[datetime] = None
    max_occurrences: Optional[int] = None

    is_completed: bool = False
    snooze_until: Optional[datetime] = None

    created_at: datetime
    updated_at: Optional[datetime] = None


# ───────────────────────────────────────────────────────────────────────────
# Index hints (declarative; consumed by firestore.indexes.json)
# ───────────────────────────────────────────────────────────────────────────

INDEX_HINTS = {
    "loans": [
        ["user_id", "is_active"],
        ["user_id", "status"],
        ["user_id", "next_emi_date"],
    ],
    "loan_transactions": [
        ["loan_id", "payment_date"],
        ["user_id", "payment_date"],
    ],
    "loan_prepayments": [
        ["loan_id", "date"],
        ["user_id", "date"],
    ],
    "reminders": [
        ["user_id", "reminder_type"],
        ["related_id", "reminder_type"],
    ],
}
