"""
CRITICAL regression tests for:
1. Multi-record-per-user persistence (firebase_config.insert_one bug fix)
2. /api/dashboard cross-month deltas
"""
import os
import time
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fincare-db-redesign.preview.emergentagent.com").rstrip('/') + "/api"


# ---------- Fresh user per test session to avoid stale Firestore data ----------
@pytest.fixture(scope="session")
def fresh_user():
    """Register a brand new user so no stale 1-record-per-user data leaks in."""
    ts = int(time.time())
    email = f"multirec+{ts}@test.com"
    payload = {
        "email": email, "password": "MultiRec123!",
        "name": f"MultiRec {ts}", "mobile_number": f"99{ts % 100000000:08d}",
        "security_question": "Q?", "security_answer": "A"
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=30)
    assert r.status_code in (200, 201), f"register failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    return {
        "email": email,
        "token": data.get("access_token") or data.get("token"),
        "user_id": data["user"]["user_id"],
    }


@pytest.fixture(scope="session")
def client(fresh_user):
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {fresh_user['token']}",
        "Content-Type": "application/json",
    })
    return s


@pytest.fixture(scope="session")
def account(client):
    """Create one bank account to attach incomes/expenses to."""
    r = client.post(f"{BASE_URL}/accounts", json={
        "name": "TEST_MultiRec_Acct", "account_type": "bank",
        "initial_balance": 0.0,
        "account_holder_name": "TEST", "account_number": "MR1234567890", "ifsc_code": "HDFC0001234"
    }, timeout=30)
    assert r.status_code in (200, 201), f"acct create: {r.status_code} {r.text[:200]}"
    return r.json()


# =================================================================
# CRITICAL: Multi-record persistence (verifies the doc_id overwrite fix)
# =================================================================
class TestMultiRecordPersistence:
    """Each create-3-then-list test ensures the bug fix didn't regress.
    Pre-fix, only the LAST record per collection per user persisted."""

    def test_three_incomes_persist(self, client, account):
        for i, amt in enumerate([1000, 2000, 3000], start=1):
            r = client.post(f"{BASE_URL}/income", json={
                "account_id": account["account_id"],
                "amount": amt, "category": "salary",
                "source": f"TEST_src_{i}",
                "date": datetime.now(timezone.utc).isoformat(),
            }, timeout=30)
            assert r.status_code in (200, 201), f"income {i}: {r.status_code} {r.text[:200]}"

        r = client.get(f"{BASE_URL}/income", timeout=30)
        assert r.status_code == 200
        items = [x for x in r.json() if (x.get("source") or "").startswith("TEST_src_")]
        assert len(items) >= 3, f"Expected 3 incomes, got {len(items)}"

    def test_three_expenses_persist(self, client, account):
        for i, amt in enumerate([100, 200, 300], start=1):
            r = client.post(f"{BASE_URL}/expenses", json={
                "account_id": account["account_id"],
                "amount": amt, "category": "food",
                "payment_type": "cash",
                "description": f"TEST_exp_{i}",
                "date": datetime.now(timezone.utc).isoformat(),
            }, timeout=30)
            assert r.status_code in (200, 201), f"exp {i}: {r.status_code} {r.text[:200]}"
        r = client.get(f"{BASE_URL}/expenses", timeout=30)
        assert r.status_code == 200
        items = [x for x in r.json() if (x.get("description") or "").startswith("TEST_exp_")]
        assert len(items) >= 3

    def test_two_bills_persist(self, client):
        for i, amt in enumerate([500, 600], start=1):
            r = client.post(f"{BASE_URL}/bills", json={
                "name": f"TEST_bill_{i}", "amount": amt,
                "due_date": datetime.now(timezone.utc).isoformat(),
                "category": "utilities",
            }, timeout=30)
            assert r.status_code in (200, 201), f"bill {i}: {r.status_code} {r.text[:200]}"
        r = client.get(f"{BASE_URL}/bills", timeout=30)
        items = [x for x in r.json() if x.get("name", "").startswith("TEST_bill_")]
        assert len(items) >= 2

    def test_two_credit_cards_persist(self, client):
        for i in [1, 2]:
            r = client.post(f"{BASE_URL}/credit-cards", json={
                "name": f"TEST_cc_{i}", "credit_limit": 100000.0,
                "current_outstanding": 0.0, "billing_date": 1, "due_date": 15,
            }, timeout=30)
            assert r.status_code in (200, 201), f"cc {i}: {r.status_code} {r.text[:200]}"
        r = client.get(f"{BASE_URL}/credit-cards", timeout=30)
        items = [x for x in r.json() if x.get("name", "").startswith("TEST_cc_")]
        assert len(items) >= 2

    def test_two_loans_persist(self, client):
        for i in [1, 2]:
            r = client.post(f"{BASE_URL}/loans", json={
                "name": f"TEST_loan_{i}", "loan_type": "personal",
                "principal_amount": 500000.0, "outstanding_amount": 400000.0,
                "interest_rate": 10.0, "emi_amount": 10000.0,
                "tenure_months": 60,
                "start_date": datetime.now(timezone.utc).isoformat(),
            }, timeout=30)
            assert r.status_code in (200, 201), f"loan {i}: {r.status_code} {r.text[:200]}"
        r = client.get(f"{BASE_URL}/loans", timeout=30)
        items = [x for x in r.json() if x.get("name", "").startswith("TEST_loan_")]
        assert len(items) >= 2

    def test_two_investments_persist(self, client):
        for i in [1, 2]:
            r = client.post(f"{BASE_URL}/investments", json={
                "name": f"TEST_inv_{i}", "investment_type": "stocks",
                "invested_amount": 10000.0, "current_value": 12000.0,
                "purchase_date": datetime.now(timezone.utc).isoformat(),
            }, timeout=30)
            assert r.status_code in (200, 201), f"inv {i}: {r.status_code} {r.text[:200]}"
        r = client.get(f"{BASE_URL}/investments", timeout=30)
        items = [x for x in r.json() if x.get("name", "").startswith("TEST_inv_")]
        assert len(items) >= 2

    def test_two_reminders_persist(self, client):
        for i in [1, 2]:
            r = client.post(f"{BASE_URL}/reminders", json={
                "title": f"TEST_rem_{i}",
                "reminder_date": datetime.now(timezone.utc).isoformat(),
                "reminder_type": "custom",
            }, timeout=30)
            assert r.status_code in (200, 201), f"rem {i}: {r.status_code} {r.text[:200]}"
        r = client.get(f"{BASE_URL}/reminders", timeout=30)
        items = [x for x in r.json() if x.get("title", "").startswith("TEST_rem_")]
        assert len(items) >= 2

    def test_two_notes_persist(self, client):
        for i in [1, 2]:
            r = client.post(f"{BASE_URL}/notes", json={
                "title": f"TEST_note_{i}", "content": "x",
            }, timeout=30)
            assert r.status_code in (200, 201), f"note {i}: {r.status_code} {r.text[:200]}"
        r = client.get(f"{BASE_URL}/notes", timeout=30)
        items = [x for x in r.json() if x.get("title", "").startswith("TEST_note_")]
        assert len(items) >= 2

    def test_two_family_members_persist(self, client):
        for i, role in enumerate(["spouse", "child"], start=1):
            r = client.post(f"{BASE_URL}/family-members", json={
                "name": f"TEST_fm_{i}", "role": role,
            }, timeout=30)
            assert r.status_code in (200, 201), f"fm {i}: {r.status_code} {r.text[:200]}"
        r = client.get(f"{BASE_URL}/family-members", timeout=30)
        items = [x for x in r.json() if x.get("name", "").startswith("TEST_fm_")]
        assert len(items) >= 2


# =================================================================
# CRITICAL: Cross-month deltas on /api/dashboard
# =================================================================
@pytest.fixture(scope="session")
def delta_user():
    """Brand new user used ONLY for delta math (no other data interferes)."""
    ts = int(time.time()) + 1
    email = f"deltacheck+{ts}@test.com"
    payload = {
        "email": email, "password": "Delta123!",
        "name": f"Delta {ts}", "mobile_number": f"88{ts % 100000000:08d}",
        "security_question": "Q?", "security_answer": "A"
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=30)
    assert r.status_code in (200, 201), r.text[:200]
    data = r.json()
    return {"token": data.get("access_token") or data.get("token"),
            "user_id": data["user"]["user_id"]}


@pytest.fixture(scope="session")
def delta_client(delta_user):
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {delta_user['token']}",
        "Content-Type": "application/json",
    })
    return s


@pytest.fixture(scope="session")
def delta_account(delta_client):
    r = delta_client.post(f"{BASE_URL}/accounts", json={
        "name": "TEST_Delta_Acct", "account_type": "bank", "initial_balance": 0.0,
        "account_holder_name": "TEST", "account_number": "DLT1234567890", "ifsc_code": "HDFC0001234"
    }, timeout=30)
    assert r.status_code in (200, 201), r.text[:200]
    return r.json()


def _last_month_iso():
    now = datetime.now(timezone.utc)
    if now.month == 1:
        y, m = now.year - 1, 12
    else:
        y, m = now.year, now.month - 1
    return datetime(y, m, 15, 12, 0, 0, tzinfo=timezone.utc).isoformat()


def _this_month_iso():
    now = datetime.now(timezone.utc)
    # Use day 1 (or earlier in the month) to be safely in current month
    return datetime(now.year, now.month, 1, 12, 0, 0, tzinfo=timezone.utc).isoformat()


class TestDashboardDeltas:
    """Verify /api/dashboard returns proper cross-month delta math."""

    def test_full_delta_response(self, delta_client, delta_account):
        acct_id = delta_account["account_id"]
        # LAST month: income=4000, expense=1000  -> savings=3000
        r = delta_client.post(f"{BASE_URL}/income", json={
            "account_id": acct_id, "amount": 4000, "category": "salary",
            "source": "TEST_lastmonth_inc", "date": _last_month_iso(),
        }, timeout=30)
        assert r.status_code in (200, 201), r.text[:200]
        r = delta_client.post(f"{BASE_URL}/expenses", json={
            "account_id": acct_id, "amount": 1000, "category": "food",
            "payment_type": "cash", "description": "TEST_lastmonth_exp",
            "date": _last_month_iso(),
        }, timeout=30)
        assert r.status_code in (200, 201), r.text[:200]

        # THIS month: income=5000, expense=2000 -> savings=3000
        r = delta_client.post(f"{BASE_URL}/income", json={
            "account_id": acct_id, "amount": 5000, "category": "salary",
            "source": "TEST_thismonth_inc", "date": _this_month_iso(),
        }, timeout=30)
        assert r.status_code in (200, 201), r.text[:200]
        r = delta_client.post(f"{BASE_URL}/expenses", json={
            "account_id": acct_id, "amount": 2000, "category": "food",
            "payment_type": "cash", "description": "TEST_thismonth_exp",
            "date": _this_month_iso(),
        }, timeout=30)
        assert r.status_code in (200, 201), r.text[:200]

        # Hit dashboard
        r = delta_client.get(f"{BASE_URL}/dashboard", timeout=30)
        assert r.status_code == 200, f"dashboard: {r.status_code} {r.text[:200]}"
        d = r.json()

        # Required new keys present
        for k in ["net_worth_delta_pct", "net_worth_delta_abs",
                  "income_delta_pct", "expense_delta_pct", "savings_delta_pct",
                  "prev_month_income", "prev_month_expenses", "prev_month_savings"]:
            assert k in d, f"missing key: {k}"

        # Math checks (use approximate to tolerate small rounding)
        assert d["monthly_income"] == 5000, d
        assert d["monthly_expenses"] == 2000, d
        assert d["monthly_savings"] == 3000, d
        assert d["prev_month_income"] == 4000, d
        assert d["prev_month_expenses"] == 1000, d
        assert d["prev_month_savings"] == 3000, d
        assert d["income_delta_pct"] == 25.0, d
        assert d["expense_delta_pct"] == 100.0, d
        assert d["savings_delta_pct"] == 0.0, d
        # net_worth_delta_abs == net flow this month = 5000-2000 = 3000
        assert d["net_worth_delta_abs"] == 3000, d
        # net_worth_delta_pct ≈ 23.1 (3000 / (13000-3000) * 100), depends on starting balance
        # Check it's a number (not crashed); detailed value depends on running balance
        assert isinstance(d["net_worth_delta_pct"], (int, float)), d


class TestDeltaEdgeCases:
    """Verify _pct_delta corner cases via fresh user."""

    def test_prev_zero_curr_positive_returns_100(self):
        # Brand-new user: no prev-month data, this-month income only
        ts = int(time.time()) + 7
        email = f"edgea+{ts}@test.com"
        reg = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email, "password": "Edge123!",
            "name": "Edge A", "mobile_number": f"77{ts % 100000000:08d}",
            "security_question": "Q?", "security_answer": "A"
        }, timeout=30)
        assert reg.status_code in (200, 201)
        tok = reg.json().get("access_token")
        h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
        # Create account + this-month income
        a = requests.post(f"{BASE_URL}/accounts", json={
            "name": "TEST_EdgeA", "account_type": "bank", "initial_balance": 0.0,
            "account_holder_name": "TEST", "account_number": "EDG1234567890", "ifsc_code": "HDFC0001234"
        }, headers=h, timeout=30).json()
        requests.post(f"{BASE_URL}/income", json={
            "account_id": a["account_id"], "amount": 1234, "category": "other",
            "source": "TEST_edgea", "date": _this_month_iso(),
        }, headers=h, timeout=30)
        r = requests.get(f"{BASE_URL}/dashboard", headers=h, timeout=30).json()
        assert r["prev_month_income"] == 0
        assert r["income_delta_pct"] == 100.0

    def test_both_zero_returns_zero(self):
        ts = int(time.time()) + 11
        reg = requests.post(f"{BASE_URL}/auth/register", json={
            "email": f"edgeb+{ts}@test.com", "password": "Edge123!",
            "name": "Edge B", "mobile_number": f"66{ts % 100000000:08d}",
            "security_question": "Q?", "security_answer": "A"
        }, timeout=30)
        assert reg.status_code in (200, 201)
        h = {"Authorization": f"Bearer {reg.json()['access_token']}",
             "Content-Type": "application/json"}
        r = requests.get(f"{BASE_URL}/dashboard", headers=h, timeout=30).json()
        assert r["income_delta_pct"] == 0.0
        assert r["expense_delta_pct"] == 0.0
        assert r["savings_delta_pct"] == 0.0


# =================================================================
# Regression: single-user mode + user_settings still upsert (one-per-user)
# =================================================================
class TestSingleUserCollections:
    def test_single_user_returns_same_user(self):
        r1 = requests.post(f"{BASE_URL}/auth/single-user", timeout=30)
        r2 = requests.post(f"{BASE_URL}/auth/single-user", timeout=30)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["user"]["user_id"] == r2.json()["user"]["user_id"]

    def test_settings_still_single_doc(self):
        # Use single-user token, mutate settings, re-fetch — value must update (not duplicate)
        tok = requests.post(f"{BASE_URL}/auth/single-user", timeout=30).json()["access_token"]
        h = {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}
        r1 = requests.put(f"{BASE_URL}/settings", json={"dark_mode": True}, headers=h, timeout=30)
        assert r1.status_code == 200, r1.text[:200]
        r2 = requests.get(f"{BASE_URL}/settings", headers=h, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["dark_mode"] is True
        # Flip it back
        requests.put(f"{BASE_URL}/settings", json={"dark_mode": False}, headers=h, timeout=30)
