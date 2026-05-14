"""
Insights v2 — NEW endpoints introduced in /app/backend/insights/* package.
Covers:
  - /api/insights/financial-summary
  - /api/insights/cashflow
  - /api/insights/cashflow/monthly-trend
  - /api/insights/spending
  - /api/insights/budget
  - /api/insights/trends
  - /api/insights/calendar
"""
import os
import pytest
import requests

BASE_URL = (
    os.environ.get("EXPO_PUBLIC_BACKEND_URL")
    or os.environ.get("REACT_APP_BACKEND_URL")
    or ""
).rstrip("/")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/single-user", timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Auth failed (Firebase quota?): {r.status_code} {r.text[:200]}")
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


PERIODS = ["month", "quarter", "year"]


# ── Financial summary ────────────────────────────────────────────────────────
class TestFinancialSummary:
    @pytest.mark.parametrize("period", PERIODS)
    def test_200_and_shape(self, auth, period):
        r = auth.get(f"{BASE_URL}/api/insights/financial-summary", params={"period": period}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["period", "label", "income", "expenses", "savings",
                  "total_balance", "accounts_summary", "over_budget_categories"]:
            assert k in d, f"missing {k}"
        assert d["period"] == period
        assert "total" in d["income"] and "vs_previous" in d["income"]
        assert "total" in d["expenses"] and "vs_previous" in d["expenses"]
        assert "total" in d["savings"] and "rate" in d["savings"]
        assert isinstance(d["accounts_summary"], list)
        assert isinstance(d["over_budget_categories"], list)


# ── Cash flow ────────────────────────────────────────────────────────────────
class TestCashflow:
    @pytest.mark.parametrize("period", PERIODS)
    def test_cashflow_shape(self, auth, period):
        r = auth.get(f"{BASE_URL}/api/insights/cashflow", params={"period": period}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["period", "label", "totals", "inflow_by_source",
                  "outflow_by_category", "by_account"]:
            assert k in d, f"missing {k}"
        t = d["totals"]
        for k in ["inflow", "outflow", "net", "in_share_pct", "out_share_pct", "growth_pct"]:
            assert k in t, f"totals missing {k}"
        assert isinstance(d["inflow_by_source"], list)
        assert isinstance(d["outflow_by_category"], list)
        assert isinstance(d["by_account"], list)

    def test_monthly_trend_6(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/cashflow/monthly-trend",
                     params={"months": 6}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "series" in d and isinstance(d["series"], list)
        assert len(d["series"]) == 6
        for p in d["series"]:
            for k in ["label", "short_label", "inflow", "outflow", "net"]:
                assert k in p


# ── Spending ─────────────────────────────────────────────────────────────────
class TestSpending:
    @pytest.mark.parametrize("period", PERIODS)
    def test_spending_shape(self, auth, period):
        r = auth.get(f"{BASE_URL}/api/insights/spending", params={"period": period}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["period", "label", "total", "vs_previous", "txn_count",
                  "avg_daily", "categories", "top_merchants"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["categories"], list)
        assert isinstance(d["top_merchants"], list)
        for cat in d["categories"]:
            for k in ["category", "amount", "count", "percentage"]:
                assert k in cat, f"category row missing {k}"
        for m in d["top_merchants"]:
            for k in ["merchant", "amount", "count"]:
                assert k in m, f"merchant row missing {k}"


# ── Budget ───────────────────────────────────────────────────────────────────
class TestBudget:
    @pytest.mark.parametrize("period", PERIODS)
    def test_budget_shape(self, auth, period):
        r = auth.get(f"{BASE_URL}/api/insights/budget", params={"period": period}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["period", "label", "categories", "over_budget",
                  "total_budget", "total_spent", "total_remaining",
                  "usage_pct", "on_track", "days_left"]:
            assert k in d, f"missing {k}"
        assert isinstance(d["categories"], list)
        assert isinstance(d["over_budget"], list)


# ── Trends ───────────────────────────────────────────────────────────────────
class TestTrends:
    @pytest.mark.parametrize("period", ["month", "6m", "year"])
    def test_trends_shape(self, auth, period):
        r = auth.get(f"{BASE_URL}/api/insights/trends", params={"period": period}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["period", "income", "expense", "investment"]:
            assert k in d
        for blk in ["income", "expense", "investment"]:
            for k in ["total", "change_pct", "series"]:
                assert k in d[blk], f"{blk} missing {k}"
            assert isinstance(d[blk]["series"], list)


# ── Calendar ─────────────────────────────────────────────────────────────────
class TestCalendar:
    def test_calendar_default(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/calendar", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["month", "year", "label", "daily_data", "transactions", "totals"]:
            assert k in d
        assert isinstance(d["daily_data"], dict)
        assert isinstance(d["transactions"], list)
        for k in ["credit", "debit", "net", "txn_count"]:
            assert k in d["totals"]

    def test_calendar_with_params(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/calendar",
                     params={"month": 5, "year": 2026}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["month"] == 5 and d["year"] == 2026
