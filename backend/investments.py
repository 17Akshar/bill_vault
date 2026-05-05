"""
Investments Module
==================

Extracted from server.py monolith during modularisation (Session 12).

Endpoints:
  POST   /api/investments        Create investment
  GET    /api/investments        List investments (filter by type)
  PUT    /api/investments/{id}   Update investment
  DELETE /api/investments/{id}   Soft-delete investment (sets is_active=False)

Note: investment-headings, dashboard wealth roll-ups, and XIRR computations
remain in server.py (they pull from multiple collections).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from firebase_config import db

investments_router = APIRouter(prefix="/api", tags=["investments"])


# ==================== MODELS ====================

class InvestmentCreate(BaseModel):
    name: str
    investment_type: str  # stocks, mutual_fund, fd, rd, ppf, nps, gold, real_estate, crypto, esop, bonds, other
    invested_amount: float
    current_value: float
    purchase_date: str
    maturity_date: Optional[str] = None
    family_member_id: Optional[str] = None
    notes: Optional[str] = None
    heading_id: Optional[str] = None
    sub_category: Optional[str] = None


class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    current_value: Optional[float] = None
    maturity_date: Optional[str] = None
    notes: Optional[str] = None


# ==================== HELPERS ====================

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


# ==================== ENDPOINTS ====================

@investments_router.post("/investments")
async def create_investment(data: InvestmentCreate, request: Request):
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
        "family_member_id": data.family_member_id,
        "notes": data.notes,
        "heading_id": data.heading_id,
        "sub_category": data.sub_category,
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
    }
    await db.investments.insert_one(investment)
    investment.pop("_id", None)
    return investment


@investments_router.get("/investments")
async def get_investments(request: Request, investment_type: Optional[str] = None):
    user = await _get_user(request)
    query: Dict = {"user_id": user.user_id, "is_active": True}
    if investment_type:
        query["investment_type"] = investment_type
    return await db.investments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)


@investments_router.put("/investments/{inv_id}")
async def update_investment(inv_id: str, data: InvestmentUpdate, request: Request):
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
    await db.investments.update_one({"investment_id": inv_id}, {"$set": update_data})
    return await db.investments.find_one({"investment_id": inv_id}, {"_id": 0})


@investments_router.delete("/investments/{inv_id}")
async def delete_investment(inv_id: str, request: Request):
    user = await _get_user(request)
    existing = await db.investments.find_one(
        {"investment_id": inv_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    await db.investments.update_one({"investment_id": inv_id}, {"$set": {"is_active": False}})
    return {"message": "Investment removed"}
