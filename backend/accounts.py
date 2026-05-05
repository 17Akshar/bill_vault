"""
Accounts Module
===============

Extracted from server.py monolith during modularisation (Session 13).

Endpoints:
  POST   /api/accounts              Create account (Bank/Cash/UPI/Overdraft)
  GET    /api/accounts              List accounts (filter by type / family member)
  GET    /api/accounts/summary      Total/positive/liability totals + 4-bucket grouping
  GET    /api/accounts/{id}         Get one account
  PUT    /api/accounts/{id}         Update account
  DELETE /api/accounts/{id}         Soft-delete (preserves transaction history)

Side-effect awareness:
- Income/Expense/Transfer endpoints in server.py update `accounts.balance`
  via the same Firestore wrapper (`firebase_config.db`) — moving the routes
  here doesn't change the data path, only registration.
- Net-worth math in `server.py:/api/wealth/net-worth` and
  `snapshots._compute_networth` reads `db.accounts` directly — unaffected.
- Dashboard reads accounts via `db` directly — unaffected.

Validation:
- Bank: `account_holder_name`, `account_number`, `ifsc_code` required
- UPI: `upi_id` required; setting `is_primary_upi=true` demotes other UPI primaries
- Overdraft: `overdraft_limit > 0`, `0 <= overdraft_used <= overdraft_limit`
- Overdraft balance is derived: `-overdraft_used` (negative => liability)
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from firebase_config import db

accounts_router = APIRouter(prefix="/api", tags=["accounts"])


# ==================== MODELS ====================

class Account(BaseModel):
    account_id: str
    user_id: str
    family_member_id: Optional[str] = None
    name: str
    account_type: str  # bank, cash, upi, credit_card, wallet, investment_account, overdraft
    ownership_type: str = "individual"  # individual, joint, business
    institution: Optional[str] = None
    balance: float = 0.0
    account_number: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    # ---- Bank-specific ----
    account_holder_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    sub_type: Optional[str] = None
    # ---- Cash-specific ----
    currency: Optional[str] = "INR"
    cash_location: Optional[str] = None
    include_in_net_worth: bool = True
    notes: Optional[str] = None
    # ---- UPI-specific ----
    upi_id: Optional[str] = None
    linked_app: Optional[str] = None
    upi_status: Optional[str] = "active"
    is_primary_upi: bool = False
    vpa: Optional[str] = None
    # ---- Overdraft-specific ----
    overdraft_limit: Optional[float] = None
    interest_rate: Optional[float] = None
    overdraft_used: Optional[float] = None
    overdraft_start_date: Optional[datetime] = None
    overdraft_end_date: Optional[datetime] = None
    overdraft_charges: Optional[float] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class AccountCreate(BaseModel):
    name: str
    account_type: str
    sub_type: Optional[str] = None
    ownership_type: str = "individual"
    institution: Optional[str] = None
    initial_balance: float = 0.0
    account_number: Optional[str] = None
    family_member_id: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    # Bank
    account_holder_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    # Cash
    currency: Optional[str] = "INR"
    cash_location: Optional[str] = None
    include_in_net_worth: Optional[bool] = True
    notes: Optional[str] = None
    # UPI
    upi_id: Optional[str] = None
    linked_app: Optional[str] = None
    upi_status: Optional[str] = "active"
    is_primary_upi: Optional[bool] = False
    vpa: Optional[str] = None
    # Overdraft
    overdraft_limit: Optional[float] = None
    interest_rate: Optional[float] = None
    overdraft_used: Optional[float] = None
    overdraft_start_date: Optional[str] = None  # ISO date
    overdraft_end_date: Optional[str] = None
    overdraft_charges: Optional[float] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_number: Optional[str] = None
    ownership_type: Optional[str] = None
    institution: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    sub_type: Optional[str] = None
    # Bank
    account_holder_name: Optional[str] = None
    ifsc_code: Optional[str] = None
    branch_name: Optional[str] = None
    # Cash
    currency: Optional[str] = None
    cash_location: Optional[str] = None
    include_in_net_worth: Optional[bool] = None
    notes: Optional[str] = None
    # UPI
    upi_id: Optional[str] = None
    linked_app: Optional[str] = None
    upi_status: Optional[str] = None
    is_primary_upi: Optional[bool] = None
    vpa: Optional[str] = None
    # Overdraft
    overdraft_limit: Optional[float] = None
    interest_rate: Optional[float] = None
    overdraft_used: Optional[float] = None
    overdraft_start_date: Optional[str] = None
    overdraft_end_date: Optional[str] = None
    overdraft_charges: Optional[float] = None
    balance: Optional[float] = None


# ==================== HELPERS ====================

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


def _parse_iso(s: Optional[str]) -> Optional[datetime]:
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date: {s}")


# ==================== ENDPOINTS ====================

@accounts_router.post("/accounts")
async def create_account(data: AccountCreate, request: Request):
    """Create a new financial account."""
    user = await _get_user(request)

    if data.family_member_id:
        fm = await db.family_members.find_one(
            {"family_member_id": data.family_member_id, "user_id": user.user_id}
        )
        if not fm:
            raise HTTPException(status_code=404, detail="Family member not found")

    atype = (data.account_type or "").lower()
    if atype == "bank":
        if not data.ifsc_code or not data.account_holder_name or not data.account_number:
            raise HTTPException(
                status_code=422,
                detail="Bank account requires account_holder_name, account_number, and ifsc_code",
            )
    elif atype == "overdraft":
        if data.overdraft_limit is None or data.overdraft_limit <= 0:
            raise HTTPException(status_code=422, detail="Overdraft requires overdraft_limit > 0")
        if data.overdraft_used is not None and data.overdraft_used < 0:
            raise HTTPException(status_code=422, detail="overdraft_used cannot be negative")
        if data.overdraft_used is not None and data.overdraft_used > data.overdraft_limit:
            raise HTTPException(status_code=422, detail="overdraft_used cannot exceed overdraft_limit")
    elif atype == "upi":
        if not data.upi_id:
            raise HTTPException(status_code=422, detail="UPI account requires upi_id")

    # Balance: overdraft starts as -used (liability), others use initial_balance
    if atype == "overdraft":
        balance = -float(data.overdraft_used or 0)
    else:
        balance = float(data.initial_balance or 0)

    account_id = f"acc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    account = {
        "account_id": account_id,
        "user_id": user.user_id,
        "family_member_id": data.family_member_id,
        "name": data.name,
        "account_type": atype,
        "sub_type": data.sub_type,
        "ownership_type": data.ownership_type or "individual",
        "institution": data.institution,
        "balance": balance,
        "account_number": data.account_number,
        "color": data.color,
        "icon": data.icon,
        # Bank
        "account_holder_name": data.account_holder_name,
        "ifsc_code": (data.ifsc_code or "").upper() or None,
        "branch_name": data.branch_name,
        # Cash
        "currency": data.currency or "INR",
        "cash_location": data.cash_location,
        "include_in_net_worth": True if data.include_in_net_worth is None else data.include_in_net_worth,
        "notes": data.notes,
        # UPI
        "upi_id": data.upi_id,
        "linked_app": data.linked_app,
        "upi_status": data.upi_status or "active",
        "is_primary_upi": bool(data.is_primary_upi),
        "vpa": data.vpa,
        # Overdraft
        "overdraft_limit": data.overdraft_limit,
        "interest_rate": data.interest_rate,
        "overdraft_used": data.overdraft_used,
        "overdraft_start_date": _parse_iso(data.overdraft_start_date),
        "overdraft_end_date": _parse_iso(data.overdraft_end_date),
        "overdraft_charges": data.overdraft_charges,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }

    # If a UPI account is marked primary, demote other UPI primaries
    if atype == "upi" and account["is_primary_upi"]:
        existing = await db.accounts.find(
            {"user_id": user.user_id, "account_type": "upi", "is_primary_upi": True},
            {"_id": 0},
        ).to_list(50)
        for ex in existing:
            await db.accounts.update_one(
                {"account_id": ex["account_id"]},
                {"$set": {"is_primary_upi": False, "updated_at": now}},
            )

    await db.accounts.insert_one(account)
    account.pop("_id", None)
    return account


@accounts_router.get("/accounts")
async def get_accounts(
    request: Request,
    account_type: Optional[str] = None,
    family_member_id: Optional[str] = None,
):
    """List active accounts for the user."""
    user = await _get_user(request)
    query = {"user_id": user.user_id, "is_active": True}
    if account_type:
        query["account_type"] = account_type
    if family_member_id:
        query["family_member_id"] = family_member_id
    return await db.accounts.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)


@accounts_router.get("/accounts/summary")
async def get_accounts_summary(request: Request):
    """
    Returns the Accounts overview data:
      total_balance        sum of all balances (signed; overdraft used is negative)
      in_accounts          sum of positive balances
      in_liabilities       absolute sum of negative balances + sum(overdraft_used)
      groups[]             bucketed by Bank / Overdraft / UPI / Cash with count + total
    """
    user = await _get_user(request)
    rows = await db.accounts.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).to_list(500)

    total_balance = 0.0
    in_accounts = 0.0
    in_liabilities = 0.0

    buckets = {
        "bank":      {"label": "Bank Accounts",           "total": 0.0, "count": 0},
        "overdraft": {"label": "Accounts with Overdraft", "total": 0.0, "count": 0},
        "upi":       {"label": "UPI Accounts",            "total": 0.0, "count": 0},
        "cash":      {"label": "Cash",                    "total": 0.0, "count": 0},
    }

    for a in rows:
        bal = float(a.get("balance") or 0.0)
        atype = (a.get("account_type") or "").lower()
        include_in_nw = a.get("include_in_net_worth", True)
        if include_in_nw:
            total_balance += bal
            if atype == "overdraft":
                in_liabilities += float(a.get("overdraft_used") or abs(min(0.0, bal)))
            elif bal < 0:
                in_liabilities += abs(bal)
            else:
                in_accounts += bal
        if atype in buckets:
            buckets[atype]["total"] += bal
            buckets[atype]["count"] += 1

    groups = [{"key": k, **v} for k, v in buckets.items()]
    return {
        "total_balance": round(total_balance, 2),
        "in_accounts": round(in_accounts, 2),
        "in_liabilities": round(in_liabilities, 2),
        "groups": groups,
    }


@accounts_router.get("/accounts/{account_id}")
async def get_account(account_id: str, request: Request):
    """Get a specific account."""
    user = await _get_user(request)
    account = await db.accounts.find_one(
        {"account_id": account_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@accounts_router.put("/accounts/{account_id}")
async def update_account(account_id: str, data: AccountUpdate, request: Request):
    """Update an account."""
    user = await _get_user(request)
    existing = await db.accounts.find_one(
        {"account_id": account_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")

    update_data = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    # Convert ISO date strings to datetimes for the overdraft fields
    for fld in ("overdraft_start_date", "overdraft_end_date"):
        if fld in update_data and isinstance(update_data[fld], str):
            update_data[fld] = _parse_iso(update_data[fld])
    if "ifsc_code" in update_data and isinstance(update_data["ifsc_code"], str):
        update_data["ifsc_code"] = update_data["ifsc_code"].upper()

    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.accounts.update_one(
        {"account_id": account_id, "user_id": user.user_id},
        {"$set": update_data},
    )
    return await db.accounts.find_one({"account_id": account_id}, {"_id": 0})


@accounts_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, request: Request):
    """Soft-delete an account (preserves transaction history)."""
    user = await _get_user(request)
    existing = await db.accounts.find_one(
        {"account_id": account_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    await db.accounts.update_one(
        {"account_id": account_id, "user_id": user.user_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}},
    )
    return {"message": "Account deactivated successfully"}
