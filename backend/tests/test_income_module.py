"""
Backend tests for the Income module (iteration_25).
Reuses existing /api/income CRUD + /api/analytics/income-breakdown endpoints.
The Income frontend (NET-NEW) adds 'recurring' / 'freq:<frequency>' to labels[].

Run:
  pytest /app/backend/tests/test_income_module.py -v \
    --junitxml=/app/test_reports/pytest/income_results.xml
"""
import os
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = "https://cash-flow-hub-81.preview.emergentagent.com"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/single-user", timeout=15)
    if r.status_code != 200:
        pytest.skip(f"single-user auth failed: HTTP {r.status_code} :: {r.text[:200]}")
    return r.json().get("token")


@pytest.fixture(scope="session")
def client(auth_token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_account(client):
    """Create or reuse a TEST_ account so income POST has a valid account_id."""
    accs = client.get(f"{BASE_URL}/api/accounts", timeout=15).json() or []
    test_acc = next((a for a in accs if a.get("name", "").startswith("TEST_")), None)
    if test_acc:
        return test_acc
    payload = {"name": "TEST_IncomeAcc", "type": "bank", "balance": 0, "currency": "INR"}
    r = client.post(f"{BASE_URL}/api/accounts", json=payload, timeout=15)
    assert r.status_code in (200, 201), f"account create failed: {r.status_code} :: {r.text[:200]}"
    return r.json()


# ---------- Helpers ----------
def _today_iso():
    return datetime.now(timezone.utc).isoformat()


# ---------- Income CRUD ----------
class TestIncomeCRUD:
    created_ids: list = []

    def test_create_income_basic(self, client, test_account):
        amt = 50000.0
        bal_before = test_account.get("balance", 0)
        payload = {
            "account_id": test_account["account_id"],
            "amount": amt,
            "category": "salary",
            "sub_category": "Base Salary",
            "source": "TEST_Employer",
            "date": _today_iso(),
            "notes": "TEST income basic",
            "labels": None,
        }
        r = client.post(f"{BASE_URL}/api/income", json=payload, timeout=15)
        assert r.status_code in (200, 201), f"{r.status_code} :: {r.text[:200]}"
        body = r.json()
        assert "income_id" in body
        assert body["amount"] == amt
        assert body["category"] == "salary"
        assert body["source"] == "TEST_Employer"
        TestIncomeCRUD.created_ids.append(body["income_id"])

        # Verify account balance updated (+amount)
        acc = client.get(f"{BASE_URL}/api/accounts/{test_account['account_id']}", timeout=15).json()
        assert abs((acc.get("balance", 0)) - (bal_before + amt)) < 0.01, \
            f"balance not adjusted: before={bal_before} after={acc.get('balance')}"

    def test_create_recurring_income_with_labels(self, client, test_account):
        payload = {
            "account_id": test_account["account_id"],
            "amount": 25000,
            "category": "freelance",
            "sub_category": "Retainer",
            "source": "TEST_Client",
            "date": _today_iso(),
            "labels": ["recurring", "freq:monthly"],
        }
        r = client.post(f"{BASE_URL}/api/income", json=payload, timeout=15)
        assert r.status_code in (200, 201), f"{r.status_code} :: {r.text[:200]}"
        body = r.json()
        assert "recurring" in (body.get("labels") or [])
        assert "freq:monthly" in (body.get("labels") or [])
        TestIncomeCRUD.created_ids.append(body["income_id"])

    def test_get_income_list(self, client):
        r = client.get(f"{BASE_URL}/api/income", timeout=15)
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list)
        ids = {i.get("income_id") for i in lst}
        for cid in TestIncomeCRUD.created_ids:
            assert cid in ids, f"created income {cid} missing in list"

    def test_get_income_by_month_year_filter(self, client):
        now = datetime.now(timezone.utc)
        r = client.get(
            f"{BASE_URL}/api/income",
            params={"month": now.month, "year": now.year},
            timeout=15,
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_income_by_date_range_filter(self, client):
        now = datetime.now(timezone.utc)
        start = (now - timedelta(days=30)).date().isoformat()
        end = (now + timedelta(days=1)).date().isoformat()
        r = client.get(
            f"{BASE_URL}/api/income",
            params={"start_date": start, "end_date": end},
            timeout=15,
        )
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_income_by_id(self, client):
        assert TestIncomeCRUD.created_ids, "no income created in earlier tests"
        iid = TestIncomeCRUD.created_ids[0]
        r = client.get(f"{BASE_URL}/api/income/{iid}", timeout=15)
        assert r.status_code == 200
        assert r.json()["income_id"] == iid

    def test_update_income(self, client, test_account):
        assert TestIncomeCRUD.created_ids
        iid = TestIncomeCRUD.created_ids[0]
        # Old amount fetched
        old = client.get(f"{BASE_URL}/api/income/{iid}", timeout=15).json()
        old_amt = old["amount"]
        bal_before = client.get(f"{BASE_URL}/api/accounts/{test_account['account_id']}", timeout=15).json()["balance"]
        new_amt = old_amt + 1000
        r = client.put(
            f"{BASE_URL}/api/income/{iid}",
            json={"amount": new_amt, "notes": "TEST updated"},
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code} :: {r.text[:200]}"
        # GET → verify persisted
        got = client.get(f"{BASE_URL}/api/income/{iid}", timeout=15).json()
        assert got["amount"] == new_amt
        assert got["notes"] == "TEST updated"
        # Account balance should adjust by delta
        bal_after = client.get(f"{BASE_URL}/api/accounts/{test_account['account_id']}", timeout=15).json()["balance"]
        assert abs((bal_after - bal_before) - 1000) < 0.01, \
            f"balance delta wrong: before={bal_before} after={bal_after}"

    def test_delete_income_reverses_balance(self, client, test_account):
        # create dedicated income to delete
        amt = 7777
        r = client.post(
            f"{BASE_URL}/api/income",
            json={
                "account_id": test_account["account_id"],
                "amount": amt,
                "category": "gift",
                "source": "TEST_Gift",
                "date": _today_iso(),
            },
            timeout=15,
        )
        assert r.status_code in (200, 201)
        iid = r.json()["income_id"]
        bal_before = client.get(f"{BASE_URL}/api/accounts/{test_account['account_id']}", timeout=15).json()["balance"]
        d = client.delete(f"{BASE_URL}/api/income/{iid}", timeout=15)
        assert d.status_code in (200, 204), f"{d.status_code} :: {d.text[:200]}"
        # GET should 404
        g = client.get(f"{BASE_URL}/api/income/{iid}", timeout=15)
        assert g.status_code == 404
        # Balance reduced by amt
        bal_after = client.get(f"{BASE_URL}/api/accounts/{test_account['account_id']}", timeout=15).json()["balance"]
        assert abs((bal_before - bal_after) - amt) < 0.01, \
            f"delete didn't reverse balance: before={bal_before} after={bal_after}"


# ---------- Analytics ----------
class TestIncomeBreakdown:
    def test_income_breakdown_shape(self, client):
        now = datetime.now(timezone.utc)
        r = client.get(
            f"{BASE_URL}/api/analytics/income-breakdown",
            params={"month": now.month, "year": now.year},
            timeout=20,
        )
        assert r.status_code == 200, f"{r.status_code} :: {r.text[:200]}"
        body = r.json()
        assert "total" in body
        assert "month" in body
        assert "year" in body
        assert "categories" in body and isinstance(body["categories"], list)
        if body["categories"]:
            c = body["categories"][0]
            for k in ("category", "amount", "count", "percentage"):
                assert k in c, f"missing key {k} in category row"

    def test_income_breakdown_totals_match_sum(self, client):
        now = datetime.now(timezone.utc)
        r = client.get(
            f"{BASE_URL}/api/analytics/income-breakdown",
            params={"month": now.month, "year": now.year},
            timeout=20,
        )
        assert r.status_code == 200
        body = r.json()
        sum_cats = sum(c.get("amount", 0) for c in body.get("categories", []))
        assert abs(sum_cats - body.get("total", 0)) < 0.01


# ---------- Recurring labels filter (client-side, but verify the data is queryable) ----------
class TestRecurringLabels:
    def test_recurring_label_persists_and_returned(self, client):
        r = client.get(f"{BASE_URL}/api/income", timeout=15)
        assert r.status_code == 200
        rec = [i for i in r.json() if "recurring" in (i.get("labels") or [])]
        assert len(rec) >= 1, "no recurring-labelled income found (expected from test_create_recurring_income)"
        # freq:* prefix present
        assert any(l.startswith("freq:") for i in rec for l in (i.get("labels") or []))


# ---------- Regression: existing accounts / family-members endpoints used by /income/add ----------
class TestSupportingEndpoints:
    def test_accounts_endpoint(self, client):
        r = client.get(f"{BASE_URL}/api/accounts", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_family_members_endpoint(self, client):
        r = client.get(f"{BASE_URL}/api/family-members", timeout=15)
        # endpoint may not exist; accept 200 or 404 but not 500
        assert r.status_code in (200, 404), f"{r.status_code} :: {r.text[:200]}"
        if r.status_code == 200:
            assert isinstance(r.json(), list)


# ---------- Teardown ----------
def test_cleanup_test_income(client):
    """Best-effort cleanup of TEST_ prefixed income rows."""
    try:
        lst = client.get(f"{BASE_URL}/api/income", timeout=15).json() or []
        for it in lst:
            if (it.get("source") or "").startswith("TEST_") or (it.get("notes") or "").startswith("TEST"):
                client.delete(f"{BASE_URL}/api/income/{it['income_id']}", timeout=10)
    except Exception:
        pass
