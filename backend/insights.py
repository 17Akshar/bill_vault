"""
Insights Module
===============
Aggregated analytics endpoints that power the Insights screen.

Endpoints:
  GET /api/insights/overview?month=&year=    — Combined monthly overview
  GET /api/insights/calendar?month=&year=    — Daily income/expense for calendar
  GET /api/insights/spending-trend?months=   — Category spending trend over N months
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Request

from firebase_config import db

insights_router = APIRouter(prefix="/api", tags=["insights"])


async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


def _month_range(year: int, month: int):
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


def _prev_month(year: int, month: int):
    if month == 1:
        return year - 1, 12
    return year, month - 1


# ─── Overview ─────────────────────────────────────────────────────────────────

@insights_router.get("/insights/overview")
async def insights_overview(
    request: Request,
    month: Optional[int] = None,
    year:  Optional[int] = None,
):
    user = await _get_user(request)
    now   = datetime.now(timezone.utc)
    m     = month or now.month
    y     = year  or now.year
    start, end = _month_range(y, m)

    py, pm = _prev_month(y, m)
    prev_start, prev_end = _month_range(py, pm)

    # ── current month ──
    income_list  = await db.income.find(  {"user_id": user.user_id, "date": {"$gte": start, "$lt": end}}, {"_id": 0}).to_list(10000)
    expense_list = await db.expenses.find({"user_id": user.user_id, "date": {"$gte": start, "$lt": end}}, {"_id": 0}).to_list(10000)

    total_income  = sum(i.get("amount", 0) for i in income_list)
    total_expense = sum(e.get("amount", 0) for e in expense_list)
    total_savings = total_income - total_expense
    savings_rate  = round(total_savings / total_income * 100, 1) if total_income > 0 else 0

    # ── previous month ──
    prev_income_list  = await db.income.find(  {"user_id": user.user_id, "date": {"$gte": prev_start, "$lt": prev_end}}, {"_id": 0}).to_list(10000)
    prev_expense_list = await db.expenses.find({"user_id": user.user_id, "date": {"$gte": prev_start, "$lt": prev_end}}, {"_id": 0}).to_list(10000)

    prev_income  = sum(i.get("amount", 0) for i in prev_income_list)
    prev_expense = sum(e.get("amount", 0) for e in prev_expense_list)
    prev_savings = prev_income - prev_expense

    def pct_change(cur, prev):
        if prev == 0: return 0.0
        return round((cur - prev) / abs(prev) * 100, 1)

    # ── accounts summary ──
    accounts = await db.accounts.find({"user_id": user.user_id, "is_active": True}, {"_id": 0}).to_list(200)
    acc_map: dict = {}
    for a in accounts:
        t = a.get("account_type", "other")
        if t not in acc_map:
            acc_map[t] = {"type": t, "label": t.replace("_", " ").title(), "count": 0, "balance": 0.0}
        acc_map[t]["count"] += 1
        acc_map[t]["balance"] = round(acc_map[t]["balance"] + float(a.get("balance", 0)), 2)
    total_balance = sum(a.get("balance", 0) for a in accounts)

    # ── budget health ──
    budgets = await db.budgets.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    exp_by_cat: dict = {}
    for e in expense_list:
        cat = e.get("category", "other")
        exp_by_cat[cat] = exp_by_cat.get(cat, 0) + e.get("amount", 0)

    over_budget = []
    for b in budgets:
        spent = exp_by_cat.get(b.get("category", ""), 0)
        limit = b.get("monthly_limit", 0)
        if limit > 0 and spent > limit:
            over_budget.append(b.get("category"))

    # ── quick insights ──
    MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    insights = []

    if total_income > 0:
        insights.append({
            "type":    "positive" if savings_rate >= 20 else ("warning" if savings_rate >= 0 else "negative"),
            "icon":    "trending-up-outline" if savings_rate >= 20 else "trending-down-outline",
            "title":   "Savings Rate",
            "text":    f"You saved {savings_rate}% of income this month — {'excellent!' if savings_rate>=30 else 'keep it up!' if savings_rate>=15 else 'aim for 20%+'}",
            "color":   "#22C55E" if savings_rate >= 20 else ("#FFB300" if savings_rate >= 0 else "#FF5252"),
        })

    income_chg = pct_change(total_income, prev_income)
    if income_chg != 0:
        insights.append({
            "type":  "positive" if income_chg > 0 else "negative",
            "icon":  "arrow-up-circle-outline" if income_chg > 0 else "arrow-down-circle-outline",
            "title": "Income Change",
            "text":  f"Income {'increased' if income_chg > 0 else 'decreased'} by {abs(income_chg)}% vs {MONTH_NAMES[pm-1]}",
            "color": "#22C55E" if income_chg > 0 else "#FF5252",
        })

    exp_chg = pct_change(total_expense, prev_expense)
    if exp_chg != 0:
        insights.append({
            "type":  "positive" if exp_chg < 0 else "warning" if exp_chg < 20 else "negative",
            "icon":  "checkmark-circle-outline" if exp_chg < 0 else "warning-outline",
            "title": "Expense Change",
            "text":  f"Expenses {'decreased' if exp_chg < 0 else 'increased'} by {abs(exp_chg)}% vs {MONTH_NAMES[pm-1]}",
            "color": "#22C55E" if exp_chg < 0 else "#FF5252",
        })

    # Top spending category
    if exp_by_cat:
        top_cat = max(exp_by_cat, key=lambda k: exp_by_cat[k])
        top_pct = round(exp_by_cat[top_cat] / total_expense * 100, 0) if total_expense > 0 else 0
        insights.append({
            "type": "info",
            "icon": "pie-chart-outline",
            "title": "Top Category",
            "text": f"{top_cat.title()} is your biggest expense at {int(top_pct)}% of spending",
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
        "month": m,
        "year":  y,
        "label": f"{MONTH_NAMES[m-1]} {y}",
        "income":   {"total": total_income,  "vs_last_month": pct_change(total_income,  prev_income)},
        "expenses": {"total": total_expense, "vs_last_month": pct_change(total_expense, prev_expense)},
        "savings":  {"total": total_savings, "rate": savings_rate, "vs_last_month": pct_change(total_savings, prev_savings)},
        "total_balance":   round(total_balance, 2),
        "accounts_summary": list(acc_map.values()),
        "quick_insights":  insights,
        "over_budget_categories": over_budget,
    }


# ─── Calendar ─────────────────────────────────────────────────────────────────

@insights_router.get("/insights/calendar")
async def insights_calendar(
    request: Request,
    month: Optional[int] = None,
    year:  Optional[int] = None,
):
    user  = await _get_user(request)
    now   = datetime.now(timezone.utc)
    m     = month or now.month
    y     = year  or now.year
    start, end = _month_range(y, m)

    income_list  = await db.income.find(  {"user_id": user.user_id, "date": {"$gte": start, "$lt": end}}, {"_id": 0}).to_list(10000)
    expense_list = await db.expenses.find({"user_id": user.user_id, "date": {"$gte": start, "$lt": end}}, {"_id": 0}).to_list(10000)

    # Build daily map
    daily: dict = {}
    def _day(item) -> str:
        d = item.get("date")
        if not d: return "0"
        if isinstance(d, datetime): return str(d.day)
        try: return str(datetime.fromisoformat(str(d).replace("Z", "+00:00")).day)
        except: return "0"

    for inc in income_list:
        day = _day(inc)
        if day not in daily: daily[day] = {"income": 0, "expense": 0}
        daily[day]["income"] += inc.get("amount", 0)

    for exp in expense_list:
        day = _day(exp)
        if day not in daily: daily[day] = {"income": 0, "expense": 0}
        daily[day]["expense"] += exp.get("amount", 0)

    # Transactions list (most recent first)
    txns = []
    for inc in income_list:
        txns.append({
            "date": str(inc.get("date", "")),
            "type": "income",
            "category": inc.get("category", "income"),
            "description": inc.get("source") or inc.get("description") or "Income",
            "amount": inc.get("amount", 0),
        })
    for exp in expense_list:
        txns.append({
            "date": str(exp.get("date", "")),
            "type": "expense",
            "category": exp.get("category", "expense"),
            "description": exp.get("description") or exp.get("source") or "Expense",
            "amount": exp.get("amount", 0),
        })
    txns.sort(key=lambda x: x["date"], reverse=True)

    return {
        "month": m, "year": y,
        "daily_data": daily,
        "transactions": txns[:100],
    }


@insights_router.get("/insights/budget-status")
async def insights_budget_status(
    request: Request,
    month: Optional[int] = None,
    year:  Optional[int] = None,
):
    """Budget status using actual expense transactions (not bills)."""
    user = await _get_user(request)
    now   = datetime.now(timezone.utc)
    m     = month or now.month
    y     = year  or now.year
    start, end = _month_range(y, m)

    budgets  = await db.budgets.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    expenses = await db.expenses.find({"user_id": user.user_id, "date": {"$gte": start, "$lt": end}}, {"_id": 0}).to_list(10000)

    # Group expenses by category
    exp_by_cat: dict = {}
    for e in expenses:
        cat = e.get("category", "other")
        exp_by_cat[cat] = exp_by_cat.get(cat, 0) + e.get("amount", 0)

    total_expense = sum(exp_by_cat.values())

    budget_status = []
    for b in budgets:
        cat   = b.get("category", "other")
        limit = float(b.get("monthly_limit", b.get("amount", 0)))
        spent = float(exp_by_cat.get(cat, 0))
        remaining = limit - spent
        pct   = round(spent / limit * 100, 1) if limit > 0 else 0
        budget_status.append({
            "category": cat,
            "limit": limit,
            "spent": spent,
            "remaining": remaining,
            "percentage": pct,
            "status": "over" if pct > 100 else "warning" if pct > 80 else "ok",
        })

    budget_status.sort(key=lambda b: b["percentage"], reverse=True)

    total_budgeted = sum(b["limit"] for b in budget_status)
    total_spent    = sum(b["spent"] for b in budget_status)

    return {
        "month": m, "year": y,
        "budget_status": budget_status,
        "total_budgeted": total_budgeted,
        "total_spent": total_spent,
        "total_remaining": total_budgeted - total_spent,
        "total_expense_this_month": total_expense,
    }


# ─── Spending trend (category over N months) ──────────────────────────────────

@insights_router.get("/insights/spending-trend")
async def spending_trend(
    request: Request,
    months: int = 6,
    top_categories: int = 5,
):
    user  = await _get_user(request)
    now   = datetime.now(timezone.utc)
    MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

    all_months = []
    cat_totals: dict = {}

    for i in range(months - 1, -1, -1):
        mn = now.month - i
        yr = now.year
        while mn <= 0: mn += 12; yr -= 1
        start, end = _month_range(yr, mn)

        expenses = await db.expenses.find(
            {"user_id": user.user_id, "date": {"$gte": start, "$lt": end}}, {"_id": 0}
        ).to_list(10000)

        by_cat: dict = {}
        for e in expenses:
            cat = e.get("category", "other")
            by_cat[cat] = by_cat.get(cat, 0) + e.get("amount", 0)
            cat_totals[cat] = cat_totals.get(cat, 0) + e.get("amount", 0)

        all_months.append({
            "label": f"{MONTHS[mn-1]} {yr}",
            "short": MONTHS[mn-1],
            "categories": by_cat,
            "total": sum(by_cat.values()),
        })

    # Pick top N categories by overall total
    top_cats = sorted(cat_totals, key=lambda k: cat_totals[k], reverse=True)[:top_categories]

    series = []
    for cat in top_cats:
        series.append({
            "category": cat,
            "data": [m["categories"].get(cat, 0) for m in all_months],
        })

    return {
        "months":  [m["label"] for m in all_months],
        "short_labels": [m["short"] for m in all_months],
        "series":  series,
        "monthly_totals": [m["total"] for m in all_months],
    }
