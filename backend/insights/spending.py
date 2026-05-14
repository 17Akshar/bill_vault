"""Spending analytics — category breakdown, top merchants, daily average."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Request

from .periods import Period, resolve_range, previous_range
from .service import (
    fetch_expenses,
    get_user_from_request,
    total_amount, group_by_category, group_by_merchant,
    add_percentages, pct_change,
)

router = APIRouter()


@router.get("/insights/spending")
async def spending_analytics(
    request: Request,
    period: Period = "month",
    month:  Optional[int] = None,
    year:   Optional[int] = None,
    top_merchants_limit: int = 10,
):
    """Spending snapshot: total, categories, top merchants, daily average."""
    user = await get_user_from_request(request)
    rng  = resolve_range(period, month, year)
    prev = previous_range(rng)

    expenses      = await fetch_expenses(user.user_id, rng)
    prev_expenses = await fetch_expenses(user.user_id, prev)

    total      = total_amount(expenses)
    prev_total = total_amount(prev_expenses)

    # Categories
    categories = list(group_by_category(expenses).values())
    categories.sort(key=lambda r: r["amount"], reverse=True)
    add_percentages(categories, total)

    # Top merchants
    merchants = list(group_by_merchant(expenses).values())
    merchants.sort(key=lambda r: r["amount"], reverse=True)
    add_percentages(merchants, total)
    top_merchants = merchants[:max(1, top_merchants_limit)]

    # Average per day (length of range in days)
    days = max(int((rng.end - rng.start).total_seconds() // 86400), 1)
    avg_daily = round(total / days, 2)

    return {
        "period":      period,
        "label":       rng.label,
        "total":       total,
        "vs_previous": pct_change(total, prev_total),
        "txn_count":   len(expenses),
        "avg_daily":   avg_daily,
        "categories":  categories,
        "top_merchants": top_merchants,
    }


@router.get("/insights/spending/category/{category}")
async def spending_by_category_detail(
    request: Request,
    category: str,
    period: Period = "month",
    month:  Optional[int] = None,
    year:   Optional[int] = None,
):
    """Detailed view for a single category: every transaction + merchants subtotal."""
    user = await get_user_from_request(request)
    rng  = resolve_range(period, month, year)

    expenses = await fetch_expenses(user.user_id, rng)
    matching = [e for e in expenses if (e.get("category") or "other").lower() == category.lower()]
    matching.sort(key=lambda e: str(e.get("date", "")), reverse=True)

    total = total_amount(matching)
    merchants = list(group_by_merchant(matching).values())
    merchants.sort(key=lambda r: r["amount"], reverse=True)
    add_percentages(merchants, total)

    return {
        "period":   period,
        "label":    rng.label,
        "category": category,
        "total":    total,
        "txn_count": len(matching),
        "transactions": matching,
        "merchants": merchants,
    }


# ── Back-compat alias for old /insights/spending-trend ───────────────────────

@router.get("/insights/spending-trend")
async def spending_trend_legacy(request: Request, months: int = 6, top_categories: int = 5):
    """Top-N category spending across the last N months (series for stacked chart)."""
    from .periods import last_n_months
    user = await get_user_from_request(request)
    ranges = last_n_months(max(1, min(months, 24)))

    per_month: list[dict] = []
    cat_totals: dict = {}
    for r in ranges:
        exps = await fetch_expenses(user.user_id, r)
        bycat: dict = {}
        for e in exps:
            cat = e.get("category") or "other"
            amt = float(e.get("amount", 0) or 0)
            bycat[cat] = bycat.get(cat, 0) + amt
            cat_totals[cat] = cat_totals.get(cat, 0) + amt
        per_month.append({
            "label":      r.label,
            "short":      r.label.split(" ")[0],
            "categories": bycat,
            "total":      sum(bycat.values()),
        })

    top_cats = sorted(cat_totals, key=lambda k: cat_totals[k], reverse=True)[:top_categories]
    series   = [{"category": c, "data": [m["categories"].get(c, 0) for m in per_month]} for c in top_cats]

    return {
        "months":         [m["label"] for m in per_month],
        "short_labels":   [m["short"] for m in per_month],
        "series":         series,
        "monthly_totals": [m["total"] for m in per_month],
    }
