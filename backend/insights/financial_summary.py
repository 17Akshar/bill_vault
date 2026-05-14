"""Financial summary — high-level overview combining income, expenses, savings, accounts."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Request

from .periods import Period, prev_month, resolve_range, MONTH_NAMES
from .service import (
    fetch_income, fetch_expenses, fetch_budgets, fetch_accounts,
    get_user_from_request,
    total_amount, group_by_category, pct_change, summarize_accounts,
)

router = APIRouter()


@router.get("/insights/financial-summary")
async def financial_summary(
    request: Request,
    period: Period = "month",
    month:  Optional[int] = None,
    year:   Optional[int] = None,
):
    """Combined high-level snapshot: income, expenses, savings, accounts, quick insights."""
    user = await get_user_from_request(request)
    rng  = resolve_range(period, month, year)

    income_list  = await fetch_income  (user.user_id, rng)
    expense_list = await fetch_expenses(user.user_id, rng)

    total_income  = total_amount(income_list)
    total_expense = total_amount(expense_list)
    total_savings = total_income - total_expense
    savings_rate  = round(total_savings / total_income * 100, 1) if total_income > 0 else 0.0

    # Compare with previous same-length period
    from .periods import previous_range
    prev = previous_range(rng)
    prev_income_list  = await fetch_income  (user.user_id, prev)
    prev_expense_list = await fetch_expenses(user.user_id, prev)
    prev_income  = total_amount(prev_income_list)
    prev_expense = total_amount(prev_expense_list)
    prev_savings = prev_income - prev_expense

    # Accounts
    accounts = await fetch_accounts(user.user_id)
    acc_groups, total_balance = summarize_accounts(accounts)

    # Budget — over-budget categories (only meaningful for month period)
    over_budget: list[str] = []
    if period == "month":
        budgets    = await fetch_budgets(user.user_id)
        exp_by_cat = group_by_category(expense_list)
        for b in budgets:
            cat   = b.get("category", "")
            limit = float(b.get("monthly_limit", b.get("amount", 0)) or 0)
            spent = float(exp_by_cat.get(cat, {}).get("amount", 0))
            if limit > 0 and spent > limit:
                over_budget.append(cat)

    return {
        "period":  period,
        "label":   rng.label,
        "income":   {"total": total_income,  "vs_previous": pct_change(total_income,  prev_income)},
        "expenses": {"total": total_expense, "vs_previous": pct_change(total_expense, prev_expense)},
        "savings":  {"total": total_savings, "rate": savings_rate,
                     "vs_previous": pct_change(total_savings, prev_savings)},
        "total_balance":   total_balance,
        "accounts_summary": acc_groups,
        "over_budget_categories": over_budget,
    }


# ── Back-compat alias: /api/insights/overview ─────────────────────────────────

@router.get("/insights/overview")
async def insights_overview_legacy(
    request: Request,
    month: Optional[int] = None,
    year:  Optional[int] = None,
):
    """Legacy month-only overview (preserves old response shape with quick_insights)."""
    user = await get_user_from_request(request)
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    m   = month or now.month
    y   = year  or now.year
    rng = resolve_range("month", m, y)
    py, pm = prev_month(y, m)
    prev = resolve_range("month", pm, py)

    income_list  = await fetch_income  (user.user_id, rng)
    expense_list = await fetch_expenses(user.user_id, rng)
    prev_income_list  = await fetch_income  (user.user_id, prev)
    prev_expense_list = await fetch_expenses(user.user_id, prev)

    total_income  = total_amount(income_list)
    total_expense = total_amount(expense_list)
    total_savings = total_income - total_expense
    savings_rate  = round(total_savings / total_income * 100, 1) if total_income > 0 else 0
    prev_income   = total_amount(prev_income_list)
    prev_expense  = total_amount(prev_expense_list)
    prev_savings  = prev_income - prev_expense

    accounts = await fetch_accounts(user.user_id)
    acc_groups, total_balance = summarize_accounts(accounts)

    exp_by_cat = group_by_category(expense_list)
    budgets    = await fetch_budgets(user.user_id)
    over_budget = []
    for b in budgets:
        cat   = b.get("category", "")
        limit = float(b.get("monthly_limit", 0) or 0)
        spent = float(exp_by_cat.get(cat, {}).get("amount", 0))
        if limit > 0 and spent > limit:
            over_budget.append(cat)

    # ── Quick insights ──
    insights = []
    if total_income > 0:
        insights.append({
            "type":  "positive" if savings_rate >= 20 else ("warning" if savings_rate >= 0 else "negative"),
            "icon":  "trending-up-outline" if savings_rate >= 20 else "trending-down-outline",
            "title": "Savings Rate",
            "text":  f"You saved {savings_rate}% of income this month — "
                     f"{'excellent!' if savings_rate >= 30 else 'keep it up!' if savings_rate >= 15 else 'aim for 20%+'}",
            "color": "#22C55E" if savings_rate >= 20 else ("#FFB300" if savings_rate >= 0 else "#FF5252"),
        })
    inc_chg = pct_change(total_income, prev_income)
    if inc_chg != 0:
        insights.append({
            "type":  "positive" if inc_chg > 0 else "negative",
            "icon":  "arrow-up-circle-outline" if inc_chg > 0 else "arrow-down-circle-outline",
            "title": "Income Change",
            "text":  f"Income {'increased' if inc_chg > 0 else 'decreased'} by {abs(inc_chg)}% vs {MONTH_NAMES[pm-1]}",
            "color": "#22C55E" if inc_chg > 0 else "#FF5252",
        })
    exp_chg = pct_change(total_expense, prev_expense)
    if exp_chg != 0:
        insights.append({
            "type":  "positive" if exp_chg < 0 else ("warning" if exp_chg < 20 else "negative"),
            "icon":  "checkmark-circle-outline" if exp_chg < 0 else "warning-outline",
            "title": "Expense Change",
            "text":  f"Expenses {'decreased' if exp_chg < 0 else 'increased'} by {abs(exp_chg)}% vs {MONTH_NAMES[pm-1]}",
            "color": "#22C55E" if exp_chg < 0 else "#FF5252",
        })
    if exp_by_cat:
        top_cat = max(exp_by_cat, key=lambda k: exp_by_cat[k]["amount"])
        top_pct = round(exp_by_cat[top_cat]["amount"] / total_expense * 100, 0) if total_expense > 0 else 0
        insights.append({
            "type":  "info",
            "icon":  "pie-chart-outline",
            "title": "Top Category",
            "text":  f"{top_cat.title()} is your biggest expense at {int(top_pct)}% of spending",
            "color": "#7C4DFF",
        })
    if over_budget:
        insights.append({
            "type":  "negative",
            "icon":  "alert-circle-outline",
            "title": "Budget Alert",
            "text":  f"Over budget in: {', '.join(c.title() for c in over_budget[:3])}",
            "color": "#FF5252",
        })

    return {
        "month": m, "year": y, "label": rng.label,
        "income":   {"total": total_income,  "vs_last_month": pct_change(total_income,  prev_income)},
        "expenses": {"total": total_expense, "vs_last_month": pct_change(total_expense, prev_expense)},
        "savings":  {"total": total_savings, "rate": savings_rate,
                     "vs_last_month": pct_change(total_savings, prev_savings)},
        "total_balance":   total_balance,
        "accounts_summary": acc_groups,
        "quick_insights":  insights,
        "over_budget_categories": over_budget,
    }
