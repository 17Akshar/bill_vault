"""Calendar grouping — income & expense aggregated by day for a chosen month."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Request

from .periods import resolve_range
from .service import (
    fetch_income, fetch_expenses,
    get_user_from_request,
    safe_day,
)

router = APIRouter()


@router.get("/insights/calendar")
async def calendar_grouping(
    request: Request,
    month: Optional[int] = None,
    year:  Optional[int] = None,
):
    """Daily income / expense totals plus a chronological transactions list."""
    user = await get_user_from_request(request)
    rng  = resolve_range("month", month, year)

    income_list  = await fetch_income  (user.user_id, rng)
    expense_list = await fetch_expenses(user.user_id, rng)

    # Per-day map
    daily: dict[str, dict] = {}
    def _bucket(day: int | None, kind: str, amount: float):
        if not day:
            return
        key = str(day)
        if key not in daily:
            daily[key] = {"income": 0.0, "expense": 0.0, "credit_count": 0, "debit_count": 0}
        if kind == "income":
            daily[key]["income"]  += amount
            daily[key]["credit_count"] += 1
        else:
            daily[key]["expense"] += amount
            daily[key]["debit_count"] += 1

    for inc in income_list:
        _bucket(safe_day(inc), "income",  float(inc.get("amount", 0) or 0))
    for exp in expense_list:
        _bucket(safe_day(exp), "expense", float(exp.get("amount", 0) or 0))

    # Unified transaction list
    txns: list[dict] = []
    for inc in income_list:
        txns.append({
            "date":        str(inc.get("date", "")),
            "type":        "credit",
            "category":    inc.get("category") or "income",
            "name":        inc.get("source") or inc.get("description") or "Income",
            "amount":      float(inc.get("amount", 0) or 0),
            "account_id":  inc.get("account_id"),
        })
    for exp in expense_list:
        txns.append({
            "date":        str(exp.get("date", "")),
            "type":        "debit",
            "category":    exp.get("category") or "expense",
            "name":        exp.get("merchant") or exp.get("description") or "Expense",
            "amount":      float(exp.get("amount", 0) or 0),
            "account_id":  exp.get("account_id"),
        })
    txns.sort(key=lambda x: x["date"], reverse=True)

    # Totals
    total_credit = sum(d["income"]  for d in daily.values())
    total_debit  = sum(d["expense"] for d in daily.values())

    return {
        "month":  rng.start.month,
        "year":   rng.start.year,
        "label":  rng.label,
        "daily_data":     daily,
        "transactions":   txns,
        "totals": {
            "credit":     total_credit,
            "debit":      total_debit,
            "net":        total_credit - total_debit,
            "txn_count":  len(txns),
        },
    }
