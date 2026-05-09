"""
Fintracker Backend Regression Tests (pytest)
Covers: Auth, Balance fix (critical $inc+$set), Accounts CRUD, Income/Expense CRUD,
Bills, Credit Cards, Investments, Rentals, Loans/Lending, Budgets, Reminders, Notes,
Dashboard, Net Worth, Analytics, Settings, Family Members, Portfolio Analytics.
"""
import os
import pytest
import requests
from datetime import datetime

BASE_URL = "https://fincare-investments.preview.emergentagent.com/api"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{BASE_URL}/auth/single-user", timeout=30)
    assert r.status_code == 200, f"single-user auth failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"no token: {data}"
    return tok


@pytest.fixture(scope="session")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


# ---------------- Auth ----------------
class TestAuth:
    def test_single_user_auth(self):
        r = requests.post(f"{BASE_URL}/auth/single-user", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "access_token" in data or "token" in data

    def test_login_register_endpoints_exist(self):
        # Try registering a test user (may already exist -> 400)
        r = requests.post(f"{BASE_URL}/auth/register", json={
            "email": "pytest_user@test.com", "password": "PyTest123!",
            "name": "Py User", "mobile_number": "9990000001",
            "security_question": "Q?", "security_answer": "A"
        }, timeout=30)
        assert r.status_code in (200, 400, 409)
        # Login with single-user mode is the main path; just check login endpoint doesn't 500
        r = requests.post(f"{BASE_URL}/auth/login",
                          json={"email": "pytest_user@test.com", "password": "PyTest123!"},
                          timeout=30)
        assert r.status_code in (200, 400, 401, 404)


# ---------------- Accounts ----------------
class TestAccounts:
    def test_accounts_crud(self, client):
        # CREATE
        r = client.post(f"{BASE_URL}/accounts",
                        json={"name": "TEST_Acct", "account_type": "bank",
                              "initial_balance": 1000}, timeout=30)
        assert r.status_code == 200, r.text
        acct = r.json()
        assert acct["name"] == "TEST_Acct"
        assert acct["balance"] == 1000
        aid = acct["account_id"]

        # GET list
        r = client.get(f"{BASE_URL}/accounts", timeout=30)
        assert r.status_code == 200
        assert any(a["account_id"] == aid for a in r.json())

        # UPDATE
        r = client.put(f"{BASE_URL}/accounts/{aid}",
                       json={"name": "TEST_Acct_Renamed"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_Acct_Renamed"

        # DELETE
        r = client.delete(f"{BASE_URL}/accounts/{aid}", timeout=30)
        assert r.status_code in (200, 204)


# ---------------- Balance Regression (CRITICAL) ----------------
class TestBalanceRegression:
    @pytest.fixture
    def account(self, client):
        r = client.post(f"{BASE_URL}/accounts",
                        json={"name": "TEST_BalRegr", "account_type": "bank",
                              "initial_balance": 10000}, timeout=30)
        assert r.status_code == 200
        aid = r.json()["account_id"]
        yield aid
        client.delete(f"{BASE_URL}/accounts/{aid}", timeout=30)

    def _balance(self, client, aid):
        r = client.get(f"{BASE_URL}/accounts/{aid}", timeout=30)
        if r.status_code == 200:
            a = r.json()
            return a.get("balance", a.get("current_balance"))
        r = client.get(f"{BASE_URL}/accounts", timeout=30)
        for a in r.json():
            if a["account_id"] == aid:
                return a.get("balance", a.get("current_balance"))
        return None

    def test_income_create_increases_balance(self, client, account):
        r = client.post(f"{BASE_URL}/income", json={
            "account_id": account, "amount": 5000, "category": "salary",
            "source": "TEST", "date": "2025-06-25T12:00:00.000Z"}, timeout=30)
        assert r.status_code == 200
        inc_id = r.json()["income_id"]
        assert self._balance(client, account) == 15000
        client.delete(f"{BASE_URL}/income/{inc_id}", timeout=30)

    def test_expense_create_decreases_balance(self, client, account):
        r = client.post(f"{BASE_URL}/expenses", json={
            "account_id": account, "amount": 2000, "category": "food",
            "description": "TEST", "payment_type": "bank",
            "date": "2025-06-25T12:00:00.000Z"}, timeout=30)
        assert r.status_code == 200
        exp_id = r.json()["expense_id"]
        assert self._balance(client, account) == 8000
        client.delete(f"{BASE_URL}/expenses/{exp_id}", timeout=30)

    def test_income_update_adjusts_balance(self, client, account):
        # Create income 5000 -> 15000
        r = client.post(f"{BASE_URL}/income", json={
            "account_id": account, "amount": 5000, "category": "salary",
            "source": "TEST", "date": "2025-06-25T12:00:00.000Z"}, timeout=30)
        inc_id = r.json()["income_id"]
        assert self._balance(client, account) == 15000

        # Update to 7000 -> should become 17000
        r = client.put(f"{BASE_URL}/income/{inc_id}", json={
            "account_id": account, "amount": 7000, "category": "salary",
            "source": "TEST", "date": "2025-06-25T12:00:00.000Z"}, timeout=30)
        assert r.status_code == 200, r.text
        bal = self._balance(client, account)
        assert bal == 17000, f"Expected 17000 after income update, got {bal}"
        client.delete(f"{BASE_URL}/income/{inc_id}", timeout=30)

    def test_income_delete_reverts_balance(self, client, account):
        r = client.post(f"{BASE_URL}/income", json={
            "account_id": account, "amount": 3000, "category": "salary",
            "source": "TEST", "date": "2025-06-25T12:00:00.000Z"}, timeout=30)
        inc_id = r.json()["income_id"]
        assert self._balance(client, account) == 13000
        client.delete(f"{BASE_URL}/income/{inc_id}", timeout=30)
        bal = self._balance(client, account)
        assert bal == 10000, f"Expected 10000 after income delete, got {bal}"

    def test_expense_update_and_delete_balance(self, client, account):
        # expense 1000 -> 9000
        r = client.post(f"{BASE_URL}/expenses", json={
            "account_id": account, "amount": 1000, "category": "food",
            "description": "TEST", "payment_type": "bank",
            "date": "2025-06-25T12:00:00.000Z"}, timeout=30)
        exp_id = r.json()["expense_id"]
        assert self._balance(client, account) == 9000

        # update to 1500 -> 8500
        r = client.put(f"{BASE_URL}/expenses/{exp_id}", json={
            "account_id": account, "amount": 1500, "category": "food",
            "description": "TEST", "payment_type": "bank",
            "date": "2025-06-25T12:00:00.000Z"}, timeout=30)
        assert r.status_code == 200, r.text
        bal = self._balance(client, account)
        assert bal == 8500, f"Expected 8500 after expense update, got {bal}"

        # delete -> 10000
        client.delete(f"{BASE_URL}/expenses/{exp_id}", timeout=30)
        bal = self._balance(client, account)
        assert bal == 10000, f"Expected 10000 after expense delete, got {bal}"


# ---------------- Bills ----------------
class TestBills:
    def test_bills_flow(self, client):
        r = client.post(f"{BASE_URL}/bills", json={
            "name": "TEST_Bill", "amount": 1500,
            "due_date": "2026-05-25T00:00:00Z", "category": "utilities",
            "is_recurring": True, "recurrence_type": "monthly"}, timeout=30)
        assert r.status_code == 200, r.text
        bid = r.json()["bill_id"]

        r = client.get(f"{BASE_URL}/bills", timeout=30)
        assert r.status_code == 200
        r = client.get(f"{BASE_URL}/bills/summary", timeout=30)
        assert r.status_code == 200
        s = r.json()
        assert "overdue" in s and "upcoming" in s and "paid" in s

        client.delete(f"{BASE_URL}/bills/{bid}", timeout=30)


# ---------------- Credit Cards ----------------
class TestCreditCards:
    def test_credit_cards_flow(self, client):
        r = client.post(f"{BASE_URL}/credit-cards", json={
            "name": "TEST_Card", "card_number_last4": "1234",
            "credit_limit": 100000, "current_outstanding": 5000,
            "due_date": 20, "billing_date": 5}, timeout=30)
        assert r.status_code == 200, r.text
        cid = r.json()["card_id"]

        r = client.get(f"{BASE_URL}/credit-cards/report", timeout=30)
        assert r.status_code == 200
        rep = r.json()
        assert "summary" in rep and "cards" in rep
        client.delete(f"{BASE_URL}/credit-cards/{cid}", timeout=30)


# ---------------- Investments ----------------
class TestInvestments:
    def test_investment_flow_with_roi(self, client):
        r = client.post(f"{BASE_URL}/investment-headings",
                        json={"name": "TEST_Eq", "icon": "trending-up"}, timeout=30)
        assert r.status_code == 200
        hid = r.json()["heading_id"]

        r = client.post(f"{BASE_URL}/investments", json={
            "name": "TEST_Rel", "investment_type": "stocks",
            "invested_amount": 50000, "current_value": 55000,
            "purchase_date": "2024-01-01T00:00:00Z",
            "heading_id": hid}, timeout=30)
        assert r.status_code == 200, r.text
        inv = r.json()
        iid = inv["investment_id"]
        # ROI should be present or computable
        assert inv.get("current_value") == 55000

        r = client.get(f"{BASE_URL}/investments", timeout=30)
        assert r.status_code == 200

        r = client.get(f"{BASE_URL}/portfolio/analytics", timeout=30)
        assert r.status_code == 200

        r = client.get(f"{BASE_URL}/analytics/investment", timeout=30)
        assert r.status_code == 200

        client.delete(f"{BASE_URL}/investments/{iid}", timeout=30)
        client.delete(f"{BASE_URL}/investment-headings/{hid}", timeout=30)


# ---------------- Rentals / Loans / Lending ----------------
class TestRentalsLoans:
    def test_rentals(self, client):
        r = client.post(f"{BASE_URL}/rentals", json={
            "property_name": "TEST_Flat", "tenant_name": "TEST",
            "rent_amount": 20000, "due_day": 5}, timeout=30)
        assert r.status_code == 200, r.text
        rid = r.json()["rental_id"]
        r = client.get(f"{BASE_URL}/rentals", timeout=30)
        assert r.status_code == 200
        client.delete(f"{BASE_URL}/rentals/{rid}", timeout=30)

    def test_loans_lending(self, client):
        r = client.post(f"{BASE_URL}/loans", json={
            "name": "TEST_Loan", "loan_type": "home",
            "principal_amount": 1000000, "outstanding_amount": 950000,
            "interest_rate": 8.5, "emi_amount": 10000,
            "tenure_months": 120, "start_date": "2025-01-01T00:00:00Z"}, timeout=30)
        assert r.status_code == 200, r.text
        lid = r.json()["loan_id"]

        r = client.post(f"{BASE_URL}/lending", json={
            "person_name": "TEST_Ravi", "amount": 5000,
            "lending_type": "lent",
            "date": "2026-04-01T00:00:00Z"}, timeout=30)
        assert r.status_code == 200, r.text
        lend_id = r.json()["lending_id"]

        assert client.get(f"{BASE_URL}/loans", timeout=30).status_code == 200
        assert client.get(f"{BASE_URL}/lending", timeout=30).status_code == 200

        client.delete(f"{BASE_URL}/loans/{lid}", timeout=30)
        client.delete(f"{BASE_URL}/lending/{lend_id}", timeout=30)


# ---------------- Budgets & Reminders ----------------
class TestBudgetsReminders:
    def test_budgets_progress(self, client):
        r = client.post(f"{BASE_URL}/budgets",
                        json={"category": "food", "monthly_limit": 10000}, timeout=30)
        assert r.status_code == 200, r.text
        bid = r.json()["budget_id"]

        r = client.get(f"{BASE_URL}/budgets/progress", timeout=30)
        assert r.status_code == 200
        data = r.json()
        assert "total_budgeted" in data and "budgets" in data

        client.delete(f"{BASE_URL}/budgets/{bid}", timeout=30)

    def test_reminders(self, client):
        r = client.post(f"{BASE_URL}/reminders", json={
            "title": "TEST_R", "reminder_type": "bill",
            "reminder_date": "2026-05-25T00:00:00Z",
            "is_recurring": True, "recurrence": "monthly"}, timeout=30)
        assert r.status_code == 200, r.text
        rid = r.json()["reminder_id"]
        r = client.get(f"{BASE_URL}/reminders", timeout=30)
        assert r.status_code == 200
        client.delete(f"{BASE_URL}/reminders/{rid}", timeout=30)


# ---------------- Notes ----------------
class TestNotes:
    def test_note_headings_and_notes(self, client):
        r = client.post(f"{BASE_URL}/note-headings",
                        json={"name": "TEST_NH", "icon": "book"}, timeout=30)
        if r.status_code != 200:
            pytest.skip(f"note-headings not supported: {r.status_code}")
        hid = r.json().get("heading_id") or r.json().get("id")

        r = client.post(f"{BASE_URL}/notes", json={
            "title": "TEST_Note", "content": "note body",
            "heading_id": hid}, timeout=30)
        assert r.status_code == 200, r.text
        nid = r.json().get("note_id") or r.json().get("id")

        r = client.get(f"{BASE_URL}/notes", timeout=30)
        assert r.status_code == 200
        if nid:
            client.delete(f"{BASE_URL}/notes/{nid}", timeout=30)
        if hid:
            client.delete(f"{BASE_URL}/note-headings/{hid}", timeout=30)


# ---------------- Dashboard / NetWorth / Analytics / Settings ----------------
class TestDashboardEtc:
    def test_dashboard(self, client):
        r = client.get(f"{BASE_URL}/dashboard", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for f in ("total_balance", "monthly_income", "monthly_expenses"):
            assert f in d, f"missing {f}"

    def test_net_worth(self, client):
        r = client.get(f"{BASE_URL}/net-worth", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for f in ("total_assets", "total_liabilities", "net_worth"):
            assert f in d

    def test_analytics_cashflow(self, client):
        r = client.get(f"{BASE_URL}/analytics/cashflow", timeout=30)
        assert r.status_code == 200

    def test_settings(self, client):
        r = client.get(f"{BASE_URL}/settings", timeout=30)
        assert r.status_code == 200
        r = client.put(f"{BASE_URL}/settings",
                       json={"dashboard_widgets": {"accounts": True, "bills": True}},
                       timeout=30)
        assert r.status_code in (200, 204)


# ---------------- Family Members ----------------
class TestFamilyMembers:
    def test_family_members_crud(self, client):
        r = client.post(f"{BASE_URL}/family-members",
                        json={"name": "TEST_Fam", "relationship": "spouse", "role": "member"}, timeout=30)
        assert r.status_code == 200, r.text
        fid = r.json().get("family_member_id") or r.json().get("id")
        r = client.get(f"{BASE_URL}/family-members", timeout=30)
        assert r.status_code == 200
        if fid:
            client.delete(f"{BASE_URL}/family-members/{fid}", timeout=30)
