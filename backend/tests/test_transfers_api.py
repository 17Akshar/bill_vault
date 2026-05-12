"""
Transfers API tests + new optional fields on Income/Expense.

Scope (per review_request):
- POST/GET/PUT/DELETE /api/transfers
- Validations: amount>0 (422), from==to (400), missing fields (422),
  account ownership (404)
- Balance side effects: create debits from+credits to, update rebalances,
  delete reverses
- Multi-record persistence: 3 back-to-back transfers persist in the list
- Dashboard: transfers do NOT count as income/expense; total_balance is
  conserved across an inter-account move
- Income/Expense new optional fields (labels, payee, location, attachment_url)
  round-trip via GET
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://competent-haslett-9.preview.emergentagent.com",
).rstrip("/") + "/api"


# ---------------- Shared fixtures ----------------
@pytest.fixture(scope="module")
def client():
    r = requests.post(f"{BASE_URL}/auth/single-user", timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    return s


def _mk_account(client, name, balance):
    # Bank accounts require account_holder_name, account_number, ifsc_code (Session 8 validation)
    ts = int(time.time() * 1000000)
    r = client.post(f"{BASE_URL}/accounts",
                    json={"name": name, "account_type": "bank",
                          "initial_balance": balance,
                          "account_holder_name": "TEST Holder",
                          "account_number": f"ACC{ts}",
                          "ifsc_code": "HDFC0001234"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["account_id"]


def _balance(client, aid):
    r = client.get(f"{BASE_URL}/accounts", timeout=30)
    assert r.status_code == 200
    for a in r.json():
        if a["account_id"] == aid:
            return a.get("balance", a.get("current_balance"))
    return None


@pytest.fixture
def two_accounts(client):
    ts = int(time.time() * 1000)
    a1 = _mk_account(client, f"TEST_TxfrFrom_{ts}", 50000)
    a2 = _mk_account(client, f"TEST_TxfrTo_{ts}",   10000)
    yield a1, a2
    client.delete(f"{BASE_URL}/accounts/{a1}", timeout=30)
    client.delete(f"{BASE_URL}/accounts/{a2}", timeout=30)


# ---------------- Transfer create happy path ----------------
class TestTransferCreate:
    def test_happy_path(self, client, two_accounts):
        a1, a2 = two_accounts
        r = client.post(f"{BASE_URL}/transfers", json={
            "amount": 5000, "from_account_id": a1, "to_account_id": a2,
            "date": "2026-01-10T12:00:00Z", "notes": "TEST"
        }, timeout=30)
        assert r.status_code == 200, r.text
        t = r.json()
        assert t["type"] == "transfer"
        assert t["amount"] == 5000
        assert t["transfer_id"].startswith("txfr_")
        # Balances moved
        assert _balance(client, a1) == 45000
        assert _balance(client, a2) == 15000
        # Cleanup
        client.delete(f"{BASE_URL}/transfers/{t['transfer_id']}", timeout=30)

    def test_amount_zero_rejected(self, client, two_accounts):
        a1, a2 = two_accounts
        r = client.post(f"{BASE_URL}/transfers", json={
            "amount": 0, "from_account_id": a1, "to_account_id": a2,
            "date": "2026-01-10T12:00:00Z",
        }, timeout=30)
        assert r.status_code == 422, r.text

    def test_negative_amount_rejected(self, client, two_accounts):
        a1, a2 = two_accounts
        r = client.post(f"{BASE_URL}/transfers", json={
            "amount": -100, "from_account_id": a1, "to_account_id": a2,
            "date": "2026-01-10T12:00:00Z",
        }, timeout=30)
        assert r.status_code == 422

    def test_from_equals_to_rejected(self, client, two_accounts):
        a1, _ = two_accounts
        r = client.post(f"{BASE_URL}/transfers", json={
            "amount": 1000, "from_account_id": a1, "to_account_id": a1,
            "date": "2026-01-10T12:00:00Z",
        }, timeout=30)
        assert r.status_code == 400
        assert "different" in r.json().get("detail", "").lower()

    def test_missing_account_ids_rejected(self, client):
        r = client.post(f"{BASE_URL}/transfers", json={
            "amount": 1000, "date": "2026-01-10T12:00:00Z",
        }, timeout=30)
        assert r.status_code == 422

    def test_account_not_owned_rejected(self, client, two_accounts):
        a1, _ = two_accounts
        r = client.post(f"{BASE_URL}/transfers", json={
            "amount": 1000, "from_account_id": a1,
            "to_account_id": "acct_nonexistent_xxx",
            "date": "2026-01-10T12:00:00Z",
        }, timeout=30)
        assert r.status_code == 404


# ---------------- GET list & single ----------------
class TestTransferRead:
    def test_list_and_get_one(self, client, two_accounts):
        a1, a2 = two_accounts
        created_ids = []
        for i in range(3):
            r = client.post(f"{BASE_URL}/transfers", json={
                "amount": 100 + i, "from_account_id": a1, "to_account_id": a2,
                "date": f"2026-01-{10+i:02d}T12:00:00Z",
            }, timeout=30)
            assert r.status_code == 200, r.text
            created_ids.append(r.json()["transfer_id"])

        # GET list — must contain all 3 and be newest-first
        r = client.get(f"{BASE_URL}/transfers", timeout=30)
        assert r.status_code == 200
        items = r.json()
        ids_in_list = [t["transfer_id"] for t in items]
        for cid in created_ids:
            assert cid in ids_in_list, f"missing {cid} in listing (multi-record persistence fail)"

        # GET one
        r = client.get(f"{BASE_URL}/transfers/{created_ids[0]}", timeout=30)
        assert r.status_code == 200
        assert r.json()["transfer_id"] == created_ids[0]

        # Cleanup
        for tid in created_ids:
            client.delete(f"{BASE_URL}/transfers/{tid}", timeout=30)

    def test_get_nonexistent_returns_404(self, client):
        r = client.get(f"{BASE_URL}/transfers/txfr_doesnotexist", timeout=30)
        assert r.status_code == 404


# ---------------- UPDATE ----------------
class TestTransferUpdate:
    def test_amount_change_rebalances(self, client, two_accounts):
        a1, a2 = two_accounts
        r = client.post(f"{BASE_URL}/transfers", json={
            "amount": 5000, "from_account_id": a1, "to_account_id": a2,
            "date": "2026-01-10T12:00:00Z",
        }, timeout=30)
        tid = r.json()["transfer_id"]
        # After create: a1=45000, a2=15000
        assert _balance(client, a1) == 45000
        assert _balance(client, a2) == 15000

        # Update amount 5000 -> 7000
        r = client.put(f"{BASE_URL}/transfers/{tid}", json={"amount": 7000}, timeout=30)
        assert r.status_code == 200, r.text
        # After update: a1=50000-7000=43000, a2=10000+7000=17000
        assert _balance(client, a1) == 43000, f"got {_balance(client, a1)}"
        assert _balance(client, a2) == 17000, f"got {_balance(client, a2)}"

        client.delete(f"{BASE_URL}/transfers/{tid}", timeout=30)

    def test_change_from_account_rebalances(self, client):
        ts = int(time.time() * 1000)
        a1 = _mk_account(client, f"TEST_From1_{ts}", 50000)
        a2 = _mk_account(client, f"TEST_To_{ts}",    10000)
        a3 = _mk_account(client, f"TEST_From2_{ts}", 20000)
        try:
            r = client.post(f"{BASE_URL}/transfers", json={
                "amount": 4000, "from_account_id": a1, "to_account_id": a2,
                "date": "2026-01-10T12:00:00Z",
            }, timeout=30)
            tid = r.json()["transfer_id"]
            # a1=46000, a2=14000, a3=20000
            assert _balance(client, a1) == 46000
            assert _balance(client, a2) == 14000
            assert _balance(client, a3) == 20000

            # Change from a1 -> a3
            r = client.put(f"{BASE_URL}/transfers/{tid}",
                           json={"from_account_id": a3}, timeout=30)
            assert r.status_code == 200, r.text
            # a1 reverted to 50000, a3 = 20000-4000 = 16000, a2 unchanged 14000
            assert _balance(client, a1) == 50000
            assert _balance(client, a3) == 16000
            assert _balance(client, a2) == 14000

            client.delete(f"{BASE_URL}/transfers/{tid}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{a1}", timeout=30)
            client.delete(f"{BASE_URL}/accounts/{a2}", timeout=30)
            client.delete(f"{BASE_URL}/accounts/{a3}", timeout=30)


# ---------------- DELETE ----------------
class TestTransferDelete:
    def test_delete_reverses_balances(self, client, two_accounts):
        a1, a2 = two_accounts
        r = client.post(f"{BASE_URL}/transfers", json={
            "amount": 3000, "from_account_id": a1, "to_account_id": a2,
            "date": "2026-01-10T12:00:00Z",
        }, timeout=30)
        tid = r.json()["transfer_id"]
        assert _balance(client, a1) == 47000
        assert _balance(client, a2) == 13000

        r = client.delete(f"{BASE_URL}/transfers/{tid}", timeout=30)
        assert r.status_code == 200
        # Reverted
        assert _balance(client, a1) == 50000
        assert _balance(client, a2) == 10000

        # GET now 404
        r = client.get(f"{BASE_URL}/transfers/{tid}", timeout=30)
        assert r.status_code == 404


# ---------------- DASHBOARD: transfers don't count ----------------
class TestDashboardTransferIsolation:
    def test_transfer_not_in_income_expense_and_total_balance_conserved(self, client):
        ts = int(time.time() * 1000)
        a1 = _mk_account(client, f"TEST_DashA_{ts}", 20000)
        a2 = _mk_account(client, f"TEST_DashB_{ts}",  5000)
        try:
            # Snapshot BEFORE
            r = client.get(f"{BASE_URL}/dashboard", timeout=30)
            assert r.status_code == 200
            before = r.json()
            before_income = before["monthly_income"]
            before_expenses = before["monthly_expenses"]
            before_total = before["total_balance"]

            # Create transfer in current month
            from datetime import datetime, timezone
            today_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            r = client.post(f"{BASE_URL}/transfers", json={
                "amount": 2500, "from_account_id": a1, "to_account_id": a2,
                "date": today_iso,
            }, timeout=30)
            assert r.status_code == 200, r.text
            tid = r.json()["transfer_id"]

            # Dashboard AFTER
            r = client.get(f"{BASE_URL}/dashboard", timeout=30)
            assert r.status_code == 200
            after = r.json()
            assert after["monthly_income"] == before_income, \
                f"transfer leaked into monthly_income ({before_income} -> {after['monthly_income']})"
            assert after["monthly_expenses"] == before_expenses, \
                f"transfer leaked into monthly_expenses ({before_expenses} -> {after['monthly_expenses']})"
            # Total balance conserved (inter-account move)
            assert after["total_balance"] == before_total, \
                f"total_balance changed across transfer: {before_total} -> {after['total_balance']}"

            client.delete(f"{BASE_URL}/transfers/{tid}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{a1}", timeout=30)
            client.delete(f"{BASE_URL}/accounts/{a2}", timeout=30)


# ---------------- Income/Expense new optional fields ----------------
class TestIncomeExpenseNewFields:
    def test_income_optional_fields_persist(self, client):
        ts = int(time.time() * 1000)
        aid = _mk_account(client, f"TEST_IncOpt_{ts}", 0)
        try:
            payload = {
                "account_id": aid, "amount": 1000, "category": "salary",
                "source": "TEST", "date": "2026-01-10T12:00:00Z",
                "labels": ["salary", "base"],
                "location": "Office",
                "attachment_url": "https://example.com/slip.pdf",
            }
            r = client.post(f"{BASE_URL}/income", json=payload, timeout=30)
            assert r.status_code == 200, r.text
            iid = r.json()["income_id"]

            # GET it back
            r = client.get(f"{BASE_URL}/income", timeout=30)
            assert r.status_code == 200
            rec = next((x for x in r.json() if x.get("income_id") == iid), None)
            assert rec is not None, "income not found in listing"
            assert rec.get("labels") == ["salary", "base"]
            assert rec.get("location") == "Office"
            assert rec.get("attachment_url") == "https://example.com/slip.pdf"

            client.delete(f"{BASE_URL}/income/{iid}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{aid}", timeout=30)

    def test_expense_optional_fields_persist(self, client):
        ts = int(time.time() * 1000)
        aid = _mk_account(client, f"TEST_ExpOpt_{ts}", 10000)
        try:
            payload = {
                "account_id": aid, "amount": 500, "category": "shopping",
                "description": "TEST", "payment_type": "upi",
                "date": "2026-01-10T12:00:00Z",
                "labels": ["shopping"],
                "payee": "Amazon",
                "location": "Online",
                "attachment_url": "https://example.com/receipt.pdf",
            }
            r = client.post(f"{BASE_URL}/expenses", json=payload, timeout=30)
            assert r.status_code == 200, r.text
            eid = r.json()["expense_id"]

            r = client.get(f"{BASE_URL}/expenses", timeout=30)
            assert r.status_code == 200
            rec = next((x for x in r.json() if x.get("expense_id") == eid), None)
            assert rec is not None
            assert rec.get("labels") == ["shopping"]
            assert rec.get("payee") == "Amazon"
            assert rec.get("location") == "Online"
            assert rec.get("attachment_url") == "https://example.com/receipt.pdf"

            client.delete(f"{BASE_URL}/expenses/{eid}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{aid}", timeout=30)
