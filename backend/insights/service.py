"""
Shared data-access service for Insights analytics.

Reuses the EXISTING collections — no new collections are introduced:
  • db.income            — source of inflow transactions
  • db.expenses          — source of outflow transactions
  • db.budgets           — budget limits per category
  • db.investments       — invested amount & current value per holding
  • db.accounts          — bank / wallet / UPI account list

All functions are user-scoped via `user_id`.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from firebase_config import db

from .periods import DateRange


# ─── Raw fetchers ─────────────────────────────────────────────────────────────

async def fetch_income(user_id: str, r: DateRange) -> List[Dict[str, Any]]:
    return await db.income.find(
        {"user_id": user_id, "date": {"$gte": r.start, "$lt": r.end}},
        {"_id": 0},
    ).to_list(20000)


async def fetch_expenses(user_id: str, r: DateRange) -> List[Dict[str, Any]]:
    return await db.expenses.find(
        {"user_id": user_id, "date": {"$gte": r.start, "$lt": r.end}},
        {"_id": 0},
    ).to_list(20000)


async def fetch_budgets(user_id: str) -> List[Dict[str, Any]]:
    return await db.budgets.find({"user_id": user_id}, {"_id": 0}).to_list(500)


async def fetch_investments(user_id: str) -> List[Dict[str, Any]]:
    return await db.investments.find({"user_id": user_id}, {"_id": 0}).to_list(500)


async def fetch_accounts(user_id: str) -> List[Dict[str, Any]]:
    return await db.accounts.find(
        {"user_id": user_id, "is_active": True},
        {"_id": 0},
    ).to_list(500)


# ─── Aggregations ─────────────────────────────────────────────────────────────

def total_amount(items: List[Dict[str, Any]]) -> float:
    return float(sum(i.get("amount", 0) or 0 for i in items))


def group_by_category(items: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Group items by `category`, returning {cat: {amount, count}}."""
    out: Dict[str, Dict[str, Any]] = {}
    for it in items:
        cat = it.get("category") or "other"
        amt = float(it.get("amount", 0) or 0)
        if cat not in out:
            out[cat] = {"category": cat, "amount": 0.0, "count": 0}
        out[cat]["amount"] += amt
        out[cat]["count"] += 1
    return out


def group_by_source(items: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Group income items by `source` (or category fallback)."""
    out: Dict[str, Dict[str, Any]] = {}
    for it in items:
        key = it.get("source") or it.get("category") or "other"
        amt = float(it.get("amount", 0) or 0)
        if key not in out:
            out[key] = {"source": key, "amount": 0.0, "count": 0}
        out[key]["amount"] += amt
        out[key]["count"] += 1
    return out


def group_by_merchant(items: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Group expenses by `merchant` (or description fallback)."""
    out: Dict[str, Dict[str, Any]] = {}
    for it in items:
        key = (it.get("merchant") or it.get("description") or "Misc").strip()
        amt = float(it.get("amount", 0) or 0)
        cat = it.get("category") or "other"
        if key not in out:
            out[key] = {"merchant": key, "category": cat, "amount": 0.0, "count": 0}
        out[key]["amount"] += amt
        out[key]["count"] += 1
    return out


def group_by_account(items: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Group items by `account_id`."""
    out: Dict[str, Dict[str, Any]] = {}
    for it in items:
        acc = it.get("account_id") or "unassigned"
        amt = float(it.get("amount", 0) or 0)
        if acc not in out:
            out[acc] = {"account_id": acc, "amount": 0.0, "count": 0}
        out[acc]["amount"] += amt
        out[acc]["count"] += 1
    return out


def add_percentages(rows: List[Dict[str, Any]], total: float, key: str = "amount") -> None:
    """Mutate each row in-place adding a `percentage` field."""
    for r in rows:
        r["percentage"] = round((float(r.get(key, 0)) / total * 100), 1) if total > 0 else 0.0


def pct_change(current: float, previous: float) -> float:
    if previous == 0:
        return 0.0
    return round((current - previous) / abs(previous) * 100, 1)


def safe_day(item: Dict[str, Any]) -> Optional[int]:
    """Extract day-of-month (1..31) from an item's `date` field."""
    d = item.get("date")
    if not d:
        return None
    if isinstance(d, datetime):
        return d.day
    try:
        return datetime.fromisoformat(str(d).replace("Z", "+00:00")).day
    except Exception:
        return None


# ─── Account helpers ──────────────────────────────────────────────────────────

ACCOUNT_TYPE_LABELS = {
    "bank":    "Bank Accounts",
    "savings": "Bank Accounts",
    "current": "Bank Accounts",
    "wallet":  "Cash & Wallets",
    "cash":    "Cash & Wallets",
    "upi":     "UPI Accounts",
    "credit":  "Credit Cards",
    "other":   "Other Accounts",
}


def summarize_accounts(accounts: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], float]:
    """Group active accounts by display type and return (groups, total_balance)."""
    grouped: Dict[str, Dict[str, Any]] = {}
    total = 0.0
    for a in accounts:
        t = (a.get("account_type") or "other").lower()
        label = ACCOUNT_TYPE_LABELS.get(t, t.replace("_", " ").title())
        bal = float(a.get("balance", 0) or 0)
        total += bal
        if label not in grouped:
            grouped[label] = {"type": t, "label": label, "count": 0, "balance": 0.0}
        grouped[label]["count"] += 1
        grouped[label]["balance"] = round(grouped[label]["balance"] + bal, 2)
    return list(grouped.values()), round(total, 2)


# ─── Auth bridge ──────────────────────────────────────────────────────────────

async def get_user_from_request(request):
    """Resolve the authenticated user from a FastAPI `Request`.

    Imported lazily to avoid circular import with `server.py`.
    """
    from server import get_current_user  # local import
    return await get_current_user(request)
