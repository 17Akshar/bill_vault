"""
Insights & Analytics API tests
Tests for:
  - GET /api/insights/overview
  - GET /api/insights/calendar
  - GET /api/analytics/cashflow
  - GET /api/analytics/expense-breakdown
  - GET /api/analytics/spending
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/single-user")
    assert r.status_code == 200, f"Auth failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


# ─── Overview ────────────────────────────────────────────────────────────────

class TestInsightsOverview:
    def test_overview_200(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/overview")
        assert r.status_code == 200, r.text

    def test_overview_required_fields(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/overview")
        d = r.json()
        for field in ["income", "expenses", "savings", "accounts_summary", "quick_insights"]:
            assert field in d, f"Missing field: {field}"

    def test_overview_income_structure(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/overview")
        d = r.json()
        assert "total" in d["income"]
        assert "vs_last_month" in d["income"]

    def test_overview_month_param(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/overview", params={"month": 5, "year": 2026})
        assert r.status_code == 200
        d = r.json()
        assert d["month"] == 5
        assert d["year"] == 2026

    def test_overview_accounts_summary_is_list(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/overview")
        d = r.json()
        assert isinstance(d["accounts_summary"], list)

    def test_overview_quick_insights_is_list(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/overview")
        d = r.json()
        assert isinstance(d["quick_insights"], list)


# ─── Calendar ────────────────────────────────────────────────────────────────

class TestInsightsCalendar:
    def test_calendar_200(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/calendar")
        assert r.status_code == 200, r.text

    def test_calendar_required_fields(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/calendar")
        d = r.json()
        assert "daily_data" in d
        assert "transactions" in d

    def test_calendar_daily_data_is_dict(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/calendar")
        d = r.json()
        assert isinstance(d["daily_data"], dict)

    def test_calendar_transactions_is_list(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/calendar")
        d = r.json()
        assert isinstance(d["transactions"], list)

    def test_calendar_month_param(self, auth):
        r = auth.get(f"{BASE_URL}/api/insights/calendar", params={"month": 5, "year": 2026})
        assert r.status_code == 200
        d = r.json()
        assert d["month"] == 5
        assert d["year"] == 2026


# ─── Cashflow ────────────────────────────────────────────────────────────────

class TestCashflow:
    def test_cashflow_200(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/cashflow", params={"months": 6})
        assert r.status_code == 200, r.text

    def test_cashflow_has_monthly_array(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/cashflow", params={"months": 6})
        d = r.json()
        assert "monthly" in d
        assert isinstance(d["monthly"], list)
        assert len(d["monthly"]) == 6

    def test_cashflow_monthly_fields(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/cashflow", params={"months": 6})
        d = r.json()
        item = d["monthly"][0]
        for f in ["month", "year", "label", "short_label", "income", "expense", "savings", "savings_rate"]:
            assert f in item, f"Missing field: {f}"

    def test_cashflow_summary(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/cashflow", params={"months": 6})
        d = r.json()
        assert "summary" in d
        assert "total_income" in d["summary"]
        assert "total_expense" in d["summary"]


# ─── Expense Breakdown ───────────────────────────────────────────────────────

class TestExpenseBreakdown:
    def test_expense_breakdown_200(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/expense-breakdown")
        assert r.status_code == 200, r.text

    def test_expense_breakdown_fields(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/expense-breakdown")
        d = r.json()
        assert "total" in d
        assert "categories" in d
        assert isinstance(d["categories"], list)

    def test_expense_breakdown_category_structure(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/expense-breakdown", params={"month": 5, "year": 2026})
        d = r.json()
        if d["categories"]:
            cat = d["categories"][0]
            assert "category" in cat
            assert "amount" in cat
            assert "percentage" in cat

    def test_expense_breakdown_may_2026_has_groceries(self, auth):
        """Test data: 1 expense of ₹50 in Groceries category for May 2026"""
        r = auth.get(f"{BASE_URL}/api/analytics/expense-breakdown", params={"month": 5, "year": 2026})
        d = r.json()
        cats = [c["category"].lower() for c in d["categories"]]
        assert "groceries" in cats, f"Expected groceries in May 2026 expenses, found: {cats}"


# ─── Spending (Budget) ───────────────────────────────────────────────────────

class TestSpending:
    def test_spending_200(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/spending")
        assert r.status_code == 200, r.text

    def test_spending_has_budget_status(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/spending")
        d = r.json()
        assert "budget_status" in d
        assert isinstance(d["budget_status"], list)

    def test_spending_budget_status_structure(self, auth):
        r = auth.get(f"{BASE_URL}/api/analytics/spending")
        d = r.json()
        if d["budget_status"]:
            b = d["budget_status"][0]
            assert "category" in b
            assert "spent" in b
            assert "limit" in b
            assert "percentage" in b
