"""Cash flow analytics — inflow, outflow, net, by source / category / account / month."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Request

from .periods import Period, resolve_range, previous_range, last_n_months
from .service import (
    fetch_income, fetch_expenses, fetch_accounts,
    get_user_from_request,
    total_amount, group_by_source, group_by_category, group_by_account,
    add_percentages, pct_change,
)

router = APIRouter()


@router.get("/insights/cashflow")
async def cashflow_analytics(
    request: Request,
    period: Period = "month",
    month:  Optional[int] = None,
    year:   Optional[int] = None,
):
    """Cash flow snapshot for a period: net flow, inflow breakdown (by source),
    outflow breakdown (by category), per-account flow."""
    user = await get_user_from_request(request)
    rng  = resolve_range(period, month, year)
    prev = previous_range(rng)

    income_list  = await fetch_income  (user.user_id, rng)
    expense_list = await fetch_expenses(user.user_id, rng)
    prev_income_list  = await fetch_income  (user.user_id, prev)
    prev_expense_list = await fetch_expenses(user.user_id, prev)

    total_in  = total_amount(income_list)
    total_out = total_amount(expense_list)
    net       = total_in - total_out
    prev_in   = total_amount(prev_income_list)
    prev_out  = total_amount(prev_expense_list)
    prev_net  = prev_in - prev_out

    # Breakdown by source / category
    inflow_by_source = list(group_by_source(income_list).values())
    inflow_by_source.sort(key=lambda r: r["amount"], reverse=True)
    add_percentages(inflow_by_source, total_in)

    outflow_by_cat = list(group_by_category(expense_list).values())
    outflow_by_cat.sort(key=lambda r: r["amount"], reverse=True)
    add_percentages(outflow_by_cat, total_out)

    # Per-account flow (combine income + expenses keyed by account)
    inflow_by_acc  = group_by_account(income_list)
    outflow_by_acc = group_by_account(expense_list)
    accounts = await fetch_accounts(user.user_id)
    acc_name = {a.get("account_id"): a.get("name") or a.get("bank_name") or "Account" for a in accounts}
    acc_type = {a.get("account_id"): a.get("account_type") or "other" for a in accounts}

    by_account: list[dict] = []
    for acc_id in set(inflow_by_acc.keys()) | set(outflow_by_acc.keys()):
        inflow  = float(inflow_by_acc.get(acc_id,  {}).get("amount", 0))
        outflow = float(outflow_by_acc.get(acc_id, {}).get("amount", 0))
        by_account.append({
            "account_id":   acc_id,
            "name":         acc_name.get(acc_id, "Unassigned"),
            "account_type": acc_type.get(acc_id, "other"),
            "inflow":  inflow,
            "outflow": outflow,
            "net":     inflow - outflow,
            "txns":    int(inflow_by_acc.get(acc_id, {}).get("count", 0))
                     + int(outflow_by_acc.get(acc_id, {}).get("count", 0)),
        })
    by_account.sort(key=lambda r: r["inflow"] + r["outflow"], reverse=True)

    total_flow = total_in + total_out

    return {
        "period":  period,
        "label":   rng.label,
        "totals": {
            "inflow":  total_in,
            "outflow": total_out,
            "net":     net,
            "growth_pct":   pct_change(net, prev_net),
            "in_share_pct":  round(total_in  / total_flow * 100, 1) if total_flow > 0 else 0.0,
            "out_share_pct": round(total_out / total_flow * 100, 1) if total_flow > 0 else 0.0,
        },
        "inflow_by_source": inflow_by_source,
        "outflow_by_category": outflow_by_cat,
        "by_account": by_account,
    }


@router.get("/insights/cashflow/monthly-trend")
async def cashflow_monthly_trend(request: Request, months: int = 6):
    """Last N months of inflow / outflow / net — for the cash-flow bar/line chart."""
    user = await get_user_from_request(request)
    ranges = last_n_months(max(1, min(months, 24)))

    series = []
    for r in ranges:
        inc = await fetch_income  (user.user_id, r)
        exp = await fetch_expenses(user.user_id, r)
        income  = total_amount(inc)
        expense = total_amount(exp)
        series.append({
            "label":       r.label,
            "short_label": r.label.split(" ")[0],
            "inflow":      income,
            "outflow":     expense,
            "net":         income - expense,
        })

    return {"series": series}
