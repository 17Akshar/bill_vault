"""
Transfers Module
================

Implements the third transaction type per the Fintracker UI spec.
Transfers MOVE money between two accounts owned by the same user.
They DO NOT count as income or expense.

Endpoints:
  POST   /api/transfers           Create + atomically update both account balances
  GET    /api/transfers           List my transfers (newest first)
  GET    /api/transfers/{id}      Get one
  PUT    /api/transfers/{id}      Update (rebalances both accounts)
  DELETE /api/transfers/{id}      Reverse balance changes + delete

Required fields per UI:  amount, from_account_id, to_account_id, date
Optional per UI:         notes, labels[], payee, payment_type, location, attachment_url
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from firebase_config import db

logger = logging.getLogger(__name__)
transfers_router = APIRouter(prefix="/api/transfers", tags=["transfers"])


# ==================== MODELS ====================
class TransferCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Transfer amount in INR. Must be > 0.")
    from_account_id: str
    to_account_id: str
    date: str                                 # ISO 8601 (Z or +00:00 accepted)
    notes: Optional[str] = None
    labels: Optional[List[str]] = None
    payee: Optional[str] = None
    payment_type: Optional[str] = None        # cash / bank / upi / credit_card
    location: Optional[str] = None
    attachment_url: Optional[str] = None
    family_member_id: Optional[str] = None    # who initiated the transfer


class TransferUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    from_account_id: Optional[str] = None
    to_account_id: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None
    labels: Optional[List[str]] = None
    payee: Optional[str] = None
    payment_type: Optional[str] = None
    location: Optional[str] = None
    attachment_url: Optional[str] = None
    family_member_id: Optional[str] = None


# ==================== HELPERS ====================
def _parse_iso(s: str) -> datetime:
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {s}")


async def _get_account_or_404(account_id: str, user_id: str) -> dict:
    acct = await db.accounts.find_one({"account_id": account_id, "user_id": user_id})
    if not acct:
        raise HTTPException(status_code=404, detail=f"Account not found: {account_id}")
    return acct


async def _adjust_balance(account_id: str, delta: float):
    """Atomically adjust an account's balance via $inc."""
    await db.accounts.update_one(
        {"account_id": account_id},
        {"$inc": {"balance": delta},
         "$set": {"updated_at": datetime.now(timezone.utc)}},
    )


# ==================== ENDPOINTS ====================
async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


@transfers_router.post("")
async def create_transfer(data: TransferCreate, request: Request):
    """
    Create a transfer.
    Validates: amount > 0 (Pydantic), from != to, both accounts owned by user.
    Side-effects: from_account.balance -= amount, to_account.balance += amount.
    """
    user = await _get_user(request)

    if data.from_account_id == data.to_account_id:
        raise HTTPException(status_code=400,
                            detail="From Account and To Account must be different")

    # Verify both accounts exist and belong to this user
    await _get_account_or_404(data.from_account_id, user.user_id)
    await _get_account_or_404(data.to_account_id, user.user_id)

    transfer_id = f"txfr_{uuid.uuid4().hex[:16]}"
    doc = {
        "transfer_id":     transfer_id,
        "user_id":         user.user_id,
        "type":            "transfer",
        "amount":          float(data.amount),
        "from_account_id": data.from_account_id,
        "to_account_id":   data.to_account_id,
        "date":            _parse_iso(data.date),
        "notes":           data.notes,
        "labels":          data.labels or [],
        "payee":           data.payee,
        "payment_type":    data.payment_type,
        "location":        data.location,
        "attachment_url":  data.attachment_url,
        "family_member_id": data.family_member_id,
        "created_at":      datetime.now(timezone.utc),
    }
    await db.transfers.insert_one(doc)
    # Atomically adjust both balances
    await _adjust_balance(data.from_account_id, -float(data.amount))
    await _adjust_balance(data.to_account_id,    float(data.amount))

    # Strip Mongo internal fields if any leaked
    doc.pop("_id", None)
    return {**doc, "date": doc["date"].isoformat(), "created_at": doc["created_at"].isoformat()}


@transfers_router.get("")
async def list_transfers(request: Request, limit: int = 100):
    user = await _get_user(request)
    items = await db.transfers.find({"user_id": user.user_id}, {"_id": 0}) \
        .sort("date", -1).to_list(min(limit, 1000))
    # Convert datetimes for JSON
    for t in items:
        for k in ("date", "created_at", "updated_at"):
            if isinstance(t.get(k), datetime):
                t[k] = t[k].isoformat()
    return items


@transfers_router.get("/{transfer_id}")
async def get_transfer(transfer_id: str, request: Request):
    user = await _get_user(request)
    t = await db.transfers.find_one({"transfer_id": transfer_id, "user_id": user.user_id},
                                    {"_id": 0})
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    for k in ("date", "created_at", "updated_at"):
        if isinstance(t.get(k), datetime):
            t[k] = t[k].isoformat()
    return t


@transfers_router.put("/{transfer_id}")
async def update_transfer(transfer_id: str, data: TransferUpdate, request: Request):
    """
    Update a transfer. Reverses old balance impact then applies new.
    """
    user = await _get_user(request)
    old = await db.transfers.find_one({"transfer_id": transfer_id, "user_id": user.user_id})
    if not old:
        raise HTTPException(status_code=404, detail="Transfer not found")

    new_amount     = data.amount          if data.amount is not None         else old["amount"]
    new_from       = data.from_account_id if data.from_account_id is not None else old["from_account_id"]
    new_to         = data.to_account_id   if data.to_account_id is not None  else old["to_account_id"]
    if new_from == new_to:
        raise HTTPException(status_code=400, detail="From Account and To Account must differ")
    # Verify ownership of any newly-pointed accounts
    await _get_account_or_404(new_from, user.user_id)
    await _get_account_or_404(new_to,   user.user_id)

    # Reverse old impact
    await _adjust_balance(old["from_account_id"],  float(old["amount"]))
    await _adjust_balance(old["to_account_id"],   -float(old["amount"]))
    # Apply new impact
    await _adjust_balance(new_from, -float(new_amount))
    await _adjust_balance(new_to,    float(new_amount))

    # Build update set
    update_set = {"updated_at": datetime.now(timezone.utc)}
    for k in ("amount", "from_account_id", "to_account_id", "notes", "labels",
              "payee", "payment_type", "location", "attachment_url",
              "family_member_id"):
        v = getattr(data, k)
        if v is not None:
            update_set[k] = v
    if data.date is not None:
        update_set["date"] = _parse_iso(data.date)

    await db.transfers.update_one(
        {"transfer_id": transfer_id, "user_id": user.user_id},
        {"$set": update_set},
    )
    return {"message": "Transfer updated", "transfer_id": transfer_id}


@transfers_router.delete("/{transfer_id}")
async def delete_transfer(transfer_id: str, request: Request):
    """Reverse balance changes then delete the transfer record."""
    user = await _get_user(request)
    t = await db.transfers.find_one({"transfer_id": transfer_id, "user_id": user.user_id})
    if not t:
        raise HTTPException(status_code=404, detail="Transfer not found")
    await _adjust_balance(t["from_account_id"],  float(t["amount"]))
    await _adjust_balance(t["to_account_id"],   -float(t["amount"]))
    await db.transfers.delete_one({"transfer_id": transfer_id, "user_id": user.user_id})
    return {"message": "Transfer deleted", "transfer_id": transfer_id}
