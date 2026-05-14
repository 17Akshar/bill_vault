"""Trend analytics — Income / Expense / Investment series over a chosen period."""
from __future__ import annotations

from fastapi import APIRouter, Request

from .periods import last_n_months
from .service import (
    fetch_income, fetch_expenses, fetch_investments,
    get_user_from_request,
    total_amount, pct_change,
)

router = APIRouter()


def _resolve_n(period: str) -> int:
    """Map a Trends-tab period token to a month count."""
    if period == "month":
        # 4-week series approximated as 4 single-month points (current month only)
        return 1
    if period == "year":
        return 12
    # default: 6m
    return 6


@router.get("/insights/trends")
async def trend_analytics(request: Request, period: str = "6m"):
    """Returns income, expense and investment series for the chart trio.

    - For `month` we currently return a single data point per series. The
      front-end can render a flat line or aggregate weekly later.
    - For `6m` and `year` we return month-by-month series.
    """
    user = await get_user_from_request(request)
    n    = _resolve_n(period)
    ranges = last_n_months(n)

    income_series:     list[dict] = []
    expense_series:    list[dict] = []
    investment_series: list[dict] = []

    inc_total = exp_total = 0.0
    for r in ranges:
        inc = await fetch_income  (user.user_id, r)
        exp = await fetch_expenses(user.user_id, r)
        i_amt = total_amount(inc)
        e_amt = total_amount(exp)
        inc_total += i_amt
        exp_total += e_amt
        short = r.label.split(" ")[0]
        income_series.append ({"label": short, "value": i_amt})
        expense_series.append({"label": short, "value": e_amt})

    # Investment value series — investments don't have per-month history in DB,
    # so we approximate with current_value for the last point and use
    # `invested_amount` from each month's purchases for the older points.
    investments = await fetch_investments(user.user_id)
    current_value = sum(float(i.get("current_value", 0) or 0) for i in investments)

    for r in ranges:
        # invested up to end-of-month (cumulative)
        invested_to_date = 0.0
        for inv in investments:
            pd = inv.get("purchase_date")
            try:
                from datetime import datetime
                if isinstance(pd, datetime):
                    pd_dt = pd
                else:
                    pd_dt = datetime.fromisoformat(str(pd).replace("Z", "+00:00")) if pd else None
            except Exception:
                pd_dt = None
            if pd_dt is None or pd_dt < r.end:
                invested_to_date += float(inv.get("invested_amount", 0) or 0)
        investment_series.append({"label": r.label.split(" ")[0], "value": invested_to_date})

    # Overwrite the latest point with current_value if we have any holdings
    if investments and investment_series:
        investment_series[-1] = {**investment_series[-1], "value": current_value}

    # Delta calculations: latest vs previous data point in each series
    def _delta(series):
        if len(series) < 2:
            return 0.0
        prev = series[-2]["value"]
        cur  = series[-1]["value"]
        return pct_change(cur, prev)

    return {
        "period": period,
        "income": {
            "total":       sum(p["value"] for p in income_series),
            "change_pct":  _delta(income_series),
            "series":      income_series,
        },
        "expense": {
            "total":       sum(p["value"] for p in expense_series),
            "change_pct":  _delta(expense_series),
            "series":      expense_series,
        },
        "investment": {
            "total":       investment_series[-1]["value"] if investment_series else 0.0,
            "change_pct":  _delta(investment_series),
            "series":      investment_series,
        },
    }
