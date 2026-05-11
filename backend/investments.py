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

Schema Design
=============
investments collection (Firestore)
├── Common fields      — name, type, amounts, dates, status, notes, linked_account
├── type_specific_data — flexible JSON for category-specific metadata (PRAN, folio, FD number, …)
├── sale_details       — structured exit/sale info (market investments + NPS compat)
├── maturity_details   — structured maturity info (FD/RD/PPF/bonds)
└── withdrawal_details — structured withdrawal info (NPS/EPF/PPF partial)

investment_transactions collection (unchanged)
└── Per-event records: buy, sell, dividend, interest, mature, redeem, charges
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, Optional, Any, List, Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict

from firebase_config import db
from investments_calculations import InvestmentCalculations

investments_router = APIRouter(prefix="/api", tags=["investments"])


# ==================== DETAIL MODELS ====================

class SaleDetails(BaseModel):
    """Sale / exit details for market investments (stocks, MF, ETF, REIT, bonds).

    Also accepts NPS backward-compat key ``date_of_withdrawal`` (stored under
    ``sale_details`` by the NPS form) via ``extra='allow'``.
    """
    model_config = ConfigDict(extra='allow')

    date_of_sale: Optional[str] = None         # ISO date — stocks / MF / ETF / REIT / bonds
    units_sold: Optional[float] = None          # Units-based investments
    sold_nav: Optional[float] = None            # MF / ETF price per unit at sale
    sale_price: Optional[float] = None          # Bonds / stocks exit price per unit
    amount_received: Optional[float] = None     # Net sale proceeds
    tax_deducted: Optional[float] = None        # Capital-gains TDS withheld
    # NPS backward-compat: NPS form stores withdrawal date under sale_details
    date_of_withdrawal: Optional[str] = None


class MaturityDetails(BaseModel):
    """Maturity / redemption details for fixed-income investments (FD, RD, CD, bonds, PPF)."""
    model_config = ConfigDict(extra='allow')

    date_of_maturity: Optional[str] = None      # ISO date — actual maturity / redemption date
    maturity_amount: Optional[float] = None     # Final corpus at maturity
    amount_received: Optional[float] = None     # Net amount received after TDS
    tds_deducted: Optional[float] = None        # Tax deducted at source on interest
    renewed: Optional[bool] = None              # FD/RD auto-renewed on maturity?
    renewal_investment_id: Optional[str] = None # FK → investments.investment_id of renewed record


class WithdrawalDetails(BaseModel):
    """Structured withdrawal details for government scheme investments (NPS, EPF, PPF partial).

    Separate from sale_details to capture scheme-specific payout breakdowns
    (e.g. NPS mandatory annuity + lump-sum split).
    """
    model_config = ConfigDict(extra='allow')

    date_of_withdrawal: Optional[str] = None    # ISO date
    withdrawal_type: Optional[str] = None       # partial | full | premature | annuity
    amount_received: Optional[float] = None     # Net amount credited
    annuity_amount: Optional[float] = None      # NPS: mandatory annuity portion (40%)
    lumpsum_amount: Optional[float] = None      # NPS: lump-sum portion (60%)
    tax_deducted: Optional[float] = None        # TDS on withdrawal


# ==================== MODELS ====================

class InvestmentCreate(BaseModel):
    name: str
    # Supported types: stocks, mutual_funds, etf, bonds, reit, fd, corporate_deposit,
    #   rd, ppf, nps, epf, gold, silver, insurance, crypto, esop, private_equity,
    #   aif, vehicle_car, vehicle_two_wheeler, vehicle_other, arts_artifacts, others
    investment_type: str
    invested_amount: float
    current_value: float
    purchase_date: str
    maturity_date: Optional[str] = None
    # Status values: active | closed | matured | partially_sold | withdrawn | partially_withdrawn
    status: str = "active"
    family_member_id: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[List[str]] = None
    linked_account: Optional[str] = None

    # Category-specific metadata (PRAN, folio number, FD number, etc.)
    type_specific_data: Optional[Dict[str, Any]] = None

    # Structured event-detail objects (persisted at creation and on update)
    sale_details: Optional[SaleDetails] = None
    maturity_details: Optional[MaturityDetails] = None
    withdrawal_details: Optional[WithdrawalDetails] = None


class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    invested_amount: Optional[float] = None
    current_value: Optional[float] = None
    purchase_date: Optional[str] = None
    maturity_date: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    documents: Optional[List[str]] = None
    type_specific_data: Optional[Dict[str, Any]] = None

    # Typed detail objects (replaces raw Dict; extra='allow' preserves any extra keys)
    sale_details: Optional[SaleDetails] = None
    maturity_details: Optional[MaturityDetails] = None
    withdrawal_details: Optional[WithdrawalDetails] = None

    linked_account: Optional[str] = None


class TransactionCreate(BaseModel):
    transaction_type: Literal["buy", "sell", "dividend", "interest", "mature", "redeem", "charges"]
    amount: float
    quantity: Optional[float] = None
    price_per_unit: Optional[float] = None
    transaction_date: str
    notes: Optional[str] = None
    brokerage_charges: Optional[float] = None


# ==================== HELPERS ====================

async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


def _detail_to_dict(detail) -> Optional[Dict[str, Any]]:
    """Serialize a detail model to a plain dict, omitting None values.
    Accepts both Pydantic model instances and raw dicts (backward compat).
    """
    if detail is None:
        return None
    if isinstance(detail, dict):
        return detail or None
    return detail.model_dump(exclude_none=True) or None


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
        # Category-specific metadata (PRAN, folio, FD number, etc.)
        "type_specific_data": data.type_specific_data or {},
        # Structured event-detail objects
        "sale_details": _detail_to_dict(data.sale_details),
        "maturity_details": _detail_to_dict(data.maturity_details),
        "withdrawal_details": _detail_to_dict(data.withdrawal_details),
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
    """Get portfolio summary and analytics with comprehensive calculations"""
    user = await _get_user(request)
    investments = await db.investments.find(
        {"user_id": user.user_id, "is_active": True}, 
        {"_id": 0}
    ).to_list(1000)
    
    transactions = await db.investment_transactions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(5000)
    
    if not investments:
        return {
            "total_invested": 0,
            "total_current_value": 0,
            "total_gain_loss": 0,
            "gain_loss_percentage": 0,
            "by_type": [],
            "by_group": [],
            "by_status": {"active": 0, "closed": 0, "matured": 0, "partially_sold": 0},
            "total_count": 0,
            "asset_allocation": {"by_type": [], "by_group": [], "total_portfolio_value": 0},
            "diversity_score": {"score": 0, "level": "None"},
            "top_performers": [],
            "top_losers": [],
            "total_dividends": 0,
            "total_dividends_received": 0,
            "total_charges_paid": 0,
            "net_gain_loss": 0,
            "transaction_summary": {"total": 0, "buy": 0, "sell": 0, "dividend": 0, "charges": 0}
        }
    
    # Use calculation utilities
    calc = InvestmentCalculations()
    
    # Portfolio summary
    summary = calc.calculate_investment_summary(investments, transactions)
    
    # Asset allocation
    allocation = calc.calculate_asset_allocation(investments)
    
    # Top performers
    top_performers = calc.calculate_top_performers(investments, limit=5)
    top_losers = calc.calculate_top_losers(investments, limit=5)
    
    # Diversity score
    diversity = calc.calculate_portfolio_diversity_score(investments)
    
    # Group by status
    by_status = {
        "active": len([i for i in investments if i.get("status") == "active"]),
        "closed": len([i for i in investments if i.get("status") == "closed"]),
        "matured": len([i for i in investments if i.get("status") == "matured"]),
        "partially_sold": len([i for i in investments if i.get("status") == "partially_sold"])
    }
    
    return {
        **summary['portfolio'],
        "by_type": allocation['by_type'],
        "by_group": allocation['by_group'],
        "by_status": by_status,
        "total_count": summary['counts']['total'],
        "counts": summary['counts'],
        "asset_allocation": allocation,
        "diversity_score": diversity,
        "top_performers": [
            {
                "investment_id": p.get("investment_id"),
                "name": p.get("name"),
                "type": p.get("investment_type"),
                "gain_loss_percentage": p.get("gain_loss_percentage"),
                "current_value": p.get("current_value")
            }
            for p in top_performers
        ],
        "top_losers": [
            {
                "investment_id": loser.get("investment_id"),
                "name": loser.get("name"),
                "type": loser.get("investment_type"),
                "gain_loss_percentage": loser.get("gain_loss_percentage"),
                "current_value": loser.get("current_value")
            }
            for loser in top_losers
        ],
        "total_dividends": summary['total_dividends_received'],
        "total_dividends_received": summary['total_dividends_received'],
        "total_charges_paid": summary['total_charges_paid'],
        "net_gain_loss": summary['net_gain_loss'],
        "transaction_summary": summary['transaction_counts']
    }


@investments_router.get("/investments/{inv_id}")
async def get_investment_detail(inv_id: str, request: Request):
    """Get single investment details with computed metrics"""
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
    
    # Compute metrics on the fly
    invested = float(investment.get("invested_amount", 0))
    current = float(investment.get("current_value", 0))
    gain_loss = current - invested
    gain_loss_percentage = (gain_loss / invested * 100) if invested > 0 else 0.0
    
    # Aggregate per-type transaction summary
    total_dividends = sum(
        float(t.get("total_amount") or t.get("amount") or 0)
        for t in transactions if t.get("transaction_type") == "dividend"
    )
    total_charges = sum(
        float(t.get("brokerage_charges") or 0) for t in transactions
    )
    buy_count = sum(1 for t in transactions if t.get("transaction_type") == "buy")
    sell_count = sum(1 for t in transactions if t.get("transaction_type") == "sell")
    
    investment["transactions"] = transactions
    investment["metrics"] = {
        "gain_loss": round(gain_loss, 2),
        "gain_loss_percentage": round(gain_loss_percentage, 2),
        "total_dividends": round(total_dividends, 2),
        "total_charges": round(total_charges, 2),
        "buy_count": buy_count,
        "sell_count": sell_count,
        "transaction_count": len(transactions),
    }
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

    # Serialize the payload; Pydantic nested models → plain dicts automatically
    raw = data.model_dump(exclude_unset=True)
    update_data = {k: v for k, v in raw.items() if v is not None}

    # Coerce ISO date strings to datetimes for top-level date fields
    for date_key in ("maturity_date", "purchase_date"):
        v = update_data.get(date_key)
        if isinstance(v, str) and v:
            update_data[date_key] = datetime.fromisoformat(v.replace("Z", "+00:00"))

    # Normalize detail objects: Pydantic already serialized them to dicts above;
    # filter out completely-empty dicts (e.g. user cleared a section)
    for detail_key in ("sale_details", "maturity_details", "withdrawal_details"):
        if detail_key in update_data and isinstance(update_data[detail_key], dict):
            if not update_data[detail_key]:
                update_data[detail_key] = None

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
        "total_amount": data.amount,  # alias for calculations module
        "quantity": data.quantity,
        "price_per_unit": data.price_per_unit,
        "transaction_date": datetime.fromisoformat(data.transaction_date.replace("Z", "+00:00")),
        "notes": data.notes,
        "brokerage_charges": data.brokerage_charges or 0,
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


@investments_router.get("/investments/analytics/summary")
async def get_analytics_summary(request: Request):
    """Get comprehensive portfolio analytics"""
    user = await _get_user(request)
    investments = await db.investments.find(
        {"user_id": user.user_id, "is_active": True}, 
        {"_id": 0}
    ).to_list(1000)
    
    transactions = await db.investment_transactions.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(5000)
    
    calc = InvestmentCalculations()
    
    # Get complete summary
    summary = calc.calculate_investment_summary(investments, transactions)
    
    # Get diversity score
    diversity = calc.calculate_portfolio_diversity_score(investments)
    
    # Get top and bottom performers
    top_performers = calc.calculate_top_performers(investments, limit=10)
    top_losers = calc.calculate_top_losers(investments, limit=10)
    
    return {
        "portfolio_summary": summary,
        "diversity": diversity,
        "top_performers": [
            {
                "investment_id": p.get("investment_id"),
                "name": p.get("name"),
                "type": p.get("investment_type"),
                "invested_amount": p.get("invested_amount"),
                "current_value": p.get("current_value"),
                "gain_loss": p.get("gain_loss"),
                "gain_loss_percentage": p.get("gain_loss_percentage")
            }
            for p in top_performers
        ],
        "top_losers": [
            {
                "investment_id": loser.get("investment_id"),
                "name": loser.get("name"),
                "type": loser.get("investment_type"),
                "invested_amount": loser.get("invested_amount"),
                "current_value": loser.get("current_value"),
                "gain_loss": loser.get("gain_loss"),
                "gain_loss_percentage": loser.get("gain_loss_percentage")
            }
            for loser in top_losers
        ]
    }
