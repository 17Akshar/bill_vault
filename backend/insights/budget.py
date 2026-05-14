"""Budget analytics — per-category limits vs actual spend, over-budget detection."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Request

from .periods import Period, resolve_range
from .service import (
    fetch_expenses, fetch_budgets,
    get_user_from_request,
    group_by_category,
)

router = APIRouter()


def _scale_factor(period: Period) -> float:
    """Scale a monthly budget limit to the given period."""
    if period == "quarter":
        return 3.0
    if period == "year":
        return 12.0
    return 1.0


@router.get("/insights/budget")
async def budget_analytics(
    request: Request,
    period: Period = "month",
    month:  Optional[int] = None,
    year:   Optional[int] = None,
):
    """Budget status with limit/spent/remaining/percentage per category + over-budget list."""
    user  = await get_user_from_request(request)
    rng   = resolve_range(period, month, year)
    scale = _scale_factor(period)

    budgets  = await fetch_budgets(user.user_id)
    expenses = await fetch_expenses(user.user_id, rng)
    exp_by_cat = group_by_category(expenses)

    rows: list[dict] = []
    for b in budgets:
        cat   = b.get("category", "other")
        limit = float(b.get("monthly_limit", b.get("amount", 0)) or 0) * scale
        spent = float(exp_by_cat.get(cat, {}).get("amount", 0))
        remaining = limit - spent
        pct   = round(spent / limit * 100, 1) if limit > 0 else 0.0
        rows.append({
            "category":   cat,
            "limit":      limit,
            "spent":      spent,
            "remaining":  remaining,
            "percentage": pct,
            "status":     "over" if pct > 100 else "warning" if pct > 80 else "ok",
        })
    rows.sort(key=lambda r: r["percentage"], reverse=True)

    total_budget    = sum(r["limit"]     for r in rows)
    total_spent     = sum(r["spent"]     for r in rows)
    total_remaining = total_budget - total_spent
    over_budget     = [r for r in rows if r["status"] == "over"]

    days_total = max(int((rng.end - rng.start).total_seconds() // 86400), 1)
    from datetime import datetime, timezone
    now   = datetime.now(timezone.utc)
    if rng.start <= now < rng.end:
        days_left = max(int((rng.end - now).total_seconds() // 86400), 0)
    elif now < rng.start:
        days_left = days_total
    else:
        days_left = 0

    return {
        "period":           period,
        "label":            rng.label,
        "categories":       rows,
        "over_budget":      over_budget,
        "total_budget":     total_budget,
        "total_spent":      total_spent,
        "total_remaining":  total_remaining,
        "usage_pct":        round(total_spent / total_budget * 100, 1) if total_budget > 0 else 0.0,
        "on_track":         total_spent <= total_budget,
        "days_left":        days_left,
    }


# ── Back-compat alias ─────────────────────────────────────────────────────────

@router.get("/insights/budget-status")
async def budget_status_legacy(
    request: Request,
    month: Optional[int] = None,
    year:  Optional[int] = None,
):
    """Legacy month-only budget status (preserves old response shape)."""
    user = await get_user_from_request(request)
    rng  = resolve_range("month", month, year)

    budgets  = await fetch_budgets(user.user_id)
    expenses = await fetch_expenses(user.user_id, rng)
    exp_by_cat = group_by_category(expenses)
    total_expense_this_month = sum(c["amount"] for c in exp_by_cat.values())

    budget_status: list[dict] = []
    for b in budgets:
        cat   = b.get("category", "other")
        limit = float(b.get("monthly_limit", b.get("amount", 0)) or 0)
        spent = float(exp_by_cat.get(cat, {}).get("amount", 0))
        pct   = round(spent / limit * 100, 1) if limit > 0 else 0.0
        budget_status.append({
            "category":   cat,
            "limit":      limit,
            "spent":      spent,
            "remaining":  limit - spent,
            "percentage": pct,
            "status":     "over" if pct > 100 else "warning" if pct > 80 else "ok",
        })
    budget_status.sort(key=lambda r: r["percentage"], reverse=True)

    total_budgeted = sum(b["limit"] for b in budget_status)
    total_spent    = sum(b["spent"] for b in budget_status)

    return {
        "month": rng.start.month, "year": rng.start.year,
        "budget_status":    budget_status,
        "total_budgeted":   total_budgeted,
        "total_spent":      total_spent,
        "total_remaining":  total_budgeted - total_spent,
        "total_expense_this_month": total_expense_this_month,
    }
