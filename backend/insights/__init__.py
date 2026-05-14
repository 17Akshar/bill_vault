"""
Insights analytics package
==========================

A scalable, modular structure for personal-finance analytics.
Reuses existing collections (income, expenses, budgets, investments, accounts)
— **no new collections are introduced** and no data is duplicated.

Modules
-------
  • financial_summary  →  /api/insights/financial-summary, /api/insights/overview
  • cashflow           →  /api/insights/cashflow, /api/insights/cashflow/monthly-trend
  • spending           →  /api/insights/spending, /api/insights/spending/category/{cat},
                          /api/insights/spending-trend (legacy)
  • budget             →  /api/insights/budget, /api/insights/budget-status (legacy)
  • trends             →  /api/insights/trends
  • calendar           →  /api/insights/calendar

A single combined `insights_router` (mounted with prefix `/api`) is exported,
so `from insights import insights_router` continues to work for `server.py`.
"""
from __future__ import annotations

from fastapi import APIRouter

from .budget            import router as budget_router
from .calendar          import router as calendar_router
from .cashflow          import router as cashflow_router
from .financial_summary import router as financial_summary_router
from .spending          import router as spending_router
from .trends            import router as trends_router

insights_router = APIRouter(prefix="/api", tags=["insights"])
insights_router.include_router(financial_summary_router)
insights_router.include_router(cashflow_router)
insights_router.include_router(spending_router)
insights_router.include_router(budget_router)
insights_router.include_router(trends_router)
insights_router.include_router(calendar_router)

__all__ = ["insights_router"]
