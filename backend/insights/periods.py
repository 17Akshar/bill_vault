"""
Date-range helpers for Insights analytics.

A `Period` is one of: 'month', 'quarter', 'year'.
All ranges are timezone-aware UTC; intervals are [start, end).
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Literal, Optional, Tuple

Period = Literal["month", "quarter", "year"]

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
               "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


@dataclass
class DateRange:
    start: datetime
    end:   datetime
    label: str  # e.g. "May 2026", "Q2 2026", "FY 2026"


def _month_start(year: int, month: int) -> datetime:
    return datetime(year, month, 1, tzinfo=timezone.utc)


def _next_month_start(year: int, month: int) -> datetime:
    if month == 12:
        return datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    return datetime(year, month + 1, 1, tzinfo=timezone.utc)


def month_range(year: int, month: int) -> DateRange:
    return DateRange(
        start=_month_start(year, month),
        end=_next_month_start(year, month),
        label=f"{MONTH_NAMES[month - 1]} {year}",
    )


def quarter_range(year: int, month: int) -> DateRange:
    """Return the quarter (Jan-Mar / Apr-Jun / Jul-Sep / Oct-Dec) that contains `month`."""
    q_start_month = ((month - 1) // 3) * 3 + 1
    q_end_month_exclusive = q_start_month + 3
    if q_end_month_exclusive > 12:
        end = datetime(year + 1, q_end_month_exclusive - 12, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, q_end_month_exclusive, 1, tzinfo=timezone.utc)
    q_idx = (q_start_month - 1) // 3 + 1
    return DateRange(
        start=_month_start(year, q_start_month),
        end=end,
        label=f"Q{q_idx} {year}",
    )


def year_range(year: int) -> DateRange:
    return DateRange(
        start=datetime(year, 1, 1, tzinfo=timezone.utc),
        end=datetime(year + 1, 1, 1, tzinfo=timezone.utc),
        label=f"FY {year}",
    )


def prev_month(year: int, month: int) -> Tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def resolve_range(
    period: Period,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> DateRange:
    """Resolve a period name + (optional) anchor month/year to a concrete DateRange.

    Defaults to "now" if month/year omitted.
    """
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year
    if period == "quarter":
        return quarter_range(y, m)
    if period == "year":
        return year_range(y)
    return month_range(y, m)


def previous_range(r: DateRange) -> DateRange:
    """Return the period immediately before `r` of equal length."""
    delta = r.end - r.start
    return DateRange(start=r.start - delta, end=r.start, label="previous")


def last_n_months(n: int) -> list[DateRange]:
    """Return the last N month ranges (oldest first), ending at the current month."""
    now = datetime.now(timezone.utc)
    out: list[DateRange] = []
    for i in range(n - 1, -1, -1):
        m = now.month - i
        y = now.year
        while m <= 0:
            m += 12
            y -= 1
        out.append(month_range(y, m))
    return out
