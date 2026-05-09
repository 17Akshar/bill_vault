"""
Investments Module - Comprehensive Investment Management
=========================================================

Supports 26 investment types with detailed tracking.

Endpoints:
  POST   /api/investments                    Create investment
  GET    /api/investments                    List investments (filter by type/status)
  GET    /api/investments/dashboard          Portfolio summary
  GET    /api/investments/{id}               Get investment details
  PUT    /api/investments/{id}               Update investment
  DELETE /api/investments/{id}               Soft-delete investment
  POST   /api/investments/{id}/transactions  Add transaction
  GET    /api/investments/{id}/transactions  Get transaction history
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, Any, List

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from firebase_config import db

investments_router = APIRouter(prefix="/api", tags=["investments"])


# ==================== MODELS ====================

class InvestmentCreate(BaseModel):
    name: str
    investment_type: str  # stocks, mutual_funds, etf, bonds, reit, fd, corporate_deposit, rd, ppf, nps, epf, gold, silver, lic, term_insurance, mediclaim, motor_insurance, vehicle_car, vehicle_two_wheeler, vehicle_other, esop, private_equity, arts_artifacts, aif, crypto, others
    invested_amount: float
    current_value: float
    purchase_date: str
    maturity_date: Optional[str] = None
    status: str = "active"  # active, closed, matured
    family_member_id: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[List[str]] = None
    linked_account: Optional[str] = None
    
    # Type-specific data stored as flexible JSON object
    type_specific_data: Optional[Dict[str, Any]] = None


class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    current_value: Optional[float] = None
    maturity_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[List[str]] = None
    type_specific_data: Optional[Dict[str, Any]] = None


class TransactionCreate(BaseModel):
    transaction_type: str  # buy, sell, mature, redeem, interest
    amount: float
    quantity: Optional[float] = None
    price_per_unit: Optional[float] = None
    transaction_date: str
    notes: Optional[str] = None


# ==================== HELPERS ====================

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ==================== ENDPOINTS ====================

@investments_router.post("/investments")
async def create_investment(data: InvestmentCreate, request: Request):
    """Create a new investment"""
    user = await _get_user(request)
    inv_id = f"inv_{uuid.uuid4().hex[:12]}"
    investment = {
        "investment_id": inv_id,
        "user_id": user.user_id,
        "name": data.name,
        "investment_type": data.investment_type,
        "invested_amount": data.invested_amount,
        "current_value": data.current_value,
        "purchase_date": datetime.fromisoformat(data.purchase_date.replace("Z", "+00:00")),
        "maturity_date": (
            datetime.fromisoformat(data.maturity_date.replace("Z", "+00:00"))
            if data.maturity_date else None
        ),
        "status": data.status,
        "family_member_id": data.family_member_id,
        "notes": data.notes,
        "documents": data.documents or [],
        "linked_account": data.linked_account,
        "type_specific_data": data.type_specific_data or {},
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.investments.insert_one(investment)
    investment.pop("_id", None)
    return investment


@investments_router.get("/investments")
async def get_investments(
    request: Request, 
    investment_type: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all investments with optional filters"""
    user = await _get_user(request)
    query: Dict = {"user_id": user.user_id, "is_active": True}
    if investment_type:
        query["investment_type"] = investment_type
    if status:
        query["status"] = status
    investments = await db.investments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return investments


@investments_router.get("/investments/dashboard")
async def get_dashboard(request: Request):
    """Get portfolio summary and analytics"""
    user = await _get_user(request)
    investments = await db.investments.find(
        {"user_id": user.user_id, "is_active": True}, 
        {"_id": 0}
    ).to_list(1000)
    
    if not investments:
        return {
            "total_invested": 0,
            "total_current_value": 0,
            "total_gain_loss": 0,
            "gain_loss_percentage": 0,
            "by_type": [],
            "by_status": {"active": 0, "closed": 0, "matured": 0},
            "total_count": 0
        }
    
    total_invested = sum(inv.get("invested_amount", 0) for inv in investments)
    total_current = sum(inv.get("current_value", 0) for inv in investments)
    total_gain_loss = total_current - total_invested
    gain_loss_pct = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
    
    # Group by type
    by_type = {}
    for inv in investments:
        inv_type = inv.get("investment_type", "other")
        if inv_type not in by_type:
            by_type[inv_type] = {
                "type": inv_type,
                "count": 0,
                "invested": 0,
                "current_value": 0,
                "gain_loss": 0
            }
        by_type[inv_type]["count"] += 1
        by_type[inv_type]["invested"] += inv.get("invested_amount", 0)
        by_type[inv_type]["current_value"] += inv.get("current_value", 0)
        by_type[inv_type]["gain_loss"] = by_type[inv_type]["current_value"] - by_type[inv_type]["invested"]
    
    # Group by status
    by_status = {"active": 0, "closed": 0, "matured": 0}
    for inv in investments:
        status = inv.get("status", "active")
        by_status[status] = by_status.get(status, 0) + 1
    
    return {
        "total_invested": total_invested,
        "total_current_value": total_current,
        "total_gain_loss": total_gain_loss,
        "gain_loss_percentage": round(gain_loss_pct, 2),
        "by_type": list(by_type.values()),
        "by_status": by_status,
        "total_count": len(investments)
    }


@investments_router.get("/investments/{inv_id}")
async def get_investment_detail(inv_id: str, request: Request):
    """Get single investment details"""
    user = await _get_user(request)
    investment = await db.investments.find_one(
        {"investment_id": inv_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    # Get transactions
    transactions = await db.investment_transactions.find(
        {"investment_id": inv_id},
        {"_id": 0}
    ).sort("transaction_date", -1).to_list(100)
    
    investment["transactions"] = transactions
    return investment


@investments_router.put("/investments/{inv_id}")
async def update_investment(inv_id: str, data: InvestmentUpdate, request: Request):
    """Update investment"""
    user = await _get_user(request)
    existing = await db.investments.find_one(
        {"investment_id": inv_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    update_data = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    if "maturity_date" in update_data and isinstance(update_data["maturity_date"], str):
        update_data["maturity_date"] = datetime.fromisoformat(
            update_data["maturity_date"].replace("Z", "+00:00")
        )
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.investments.update_one({"investment_id": inv_id}, {"$set": update_data})
    return await db.investments.find_one({"investment_id": inv_id}, {"_id": 0})


@investments_router.delete("/investments/{inv_id}")
async def delete_investment(inv_id: str, request: Request):
    """Soft delete investment"""
    user = await _get_user(request)
    existing = await db.investments.find_one(
        {"investment_id": inv_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    await db.investments.update_one(
        {"investment_id": inv_id}, 
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Investment removed"}


@investments_router.post("/investments/{inv_id}/transactions")
async def add_transaction(inv_id: str, data: TransactionCreate, request: Request):
    """Add a transaction to an investment"""
    user = await _get_user(request)
    investment = await db.investments.find_one(
        {"investment_id": inv_id, "user_id": user.user_id}
    )
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    txn_id = f"txn_{uuid.uuid4().hex[:12]}"
    transaction = {
        "transaction_id": txn_id,
        "investment_id": inv_id,
        "user_id": user.user_id,
        "transaction_type": data.transaction_type,
        "amount": data.amount,
        "quantity": data.quantity,
        "price_per_unit": data.price_per_unit,
        "transaction_date": datetime.fromisoformat(data.transaction_date.replace("Z", "+00:00")),
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc)
    }
    await db.investment_transactions.insert_one(transaction)
    transaction.pop("_id", None)
    return transaction


@investments_router.get("/investments/{inv_id}/transactions")
async def get_transactions(inv_id: str, request: Request):
    """Get all transactions for an investment"""
    user = await _get_user(request)
    investment = await db.investments.find_one(
        {"investment_id": inv_id, "user_id": user.user_id}
    )
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    transactions = await db.investment_transactions.find(
        {"investment_id": inv_id},
        {"_id": 0}
    ).sort("transaction_date", -1).to_list(100)
    
    return transactions
