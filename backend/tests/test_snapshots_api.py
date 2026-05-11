"""
Tests for the new /api/snapshots/* endpoints and snapshot-aware /api/dashboard
net_worth_delta_basis logic.

Covers:
  * POST /api/snapshots/capture            - manual capture, schema, multi-record
  * GET  /api/snapshots                    - list, sorted desc, ?type filter
  * GET  /api/snapshots/last-month         - 404 when none, returns prior-month
                                             record otherwise
  * Auth: all endpoints reject anonymous (401)
  * Net-worth math: positive accounts + investments minus liabilities
  * Dashboard:  net_worth_delta_basis = 'flow_approx' when no prior snapshot
                net_worth_delta_basis = 'snapshot'   when one is injected

Direct Firestore inserts for the prior-month snapshot use the same `db`
abstraction the backend uses (firebase_config.db).
"""
import os
import sys
import time
import asyncio
import pytest
import requests
from datetime import datetime, timezone, timedelta

# Make backend modules importable so we can use the same firestore client to
# inject historical snapshots.
sys.path.insert(0, "/app/backend")
from firebase_config import db  # noqa: E402

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://competent-haslett-9.preview.emergentagent.com",
).rstrip("/") + "/api"


# ----------------------- Fixtures -----------------------

@pytest.fixture(scope="module")
def fresh_user():
    ts = int(time.time())
    email = f"snap+{ts}@test.com"
    payload = {
        "email": email,
        "password": "SnapTest123!",
        "name": f"Snap {ts}",
        "mobile_number": f"95{ts % 100000000:08d}",
        "security_question": "Q?",
        "security_answer": "A",
    }
    r = requests.post(f"{BASE_URL}/auth/register", json=payload, timeout=30)
    assert r.status_code in (200, 201), f"register: {r.status_code} {r.text[:200]}"
    data = r.json()
    return {
        "email": email,
        "token": data.get("access_token") or data.get("token"),
        "user_id": data["user"]["user_id"],
    }


@pytest.fixture(scope="module")
def client(fresh_user):
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {fresh_user['token']}",
        "Content-Type": "application/json",
    })
    return s


@pytest.fixture(scope="module")
def account(client):
    r = client.post(f"{BASE_URL}/accounts", json={
        "name": "TEST_Snap_Acct",
        "account_type": "bank",
        "initial_balance": 10000.0,
    }, timeout=30)
    assert r.status_code in (200, 201), r.text[:200]
    return r.json()


# ----------------------- Auth gate -----------------------

class TestSnapshotAuth:
    def test_capture_requires_auth(self):
        r = requests.post(f"{BASE_URL}/snapshots/capture", timeout=30)
        assert r.status_code in (401, 403), r.status_code

    def test_list_requires_auth(self):
        r = requests.get(f"{BASE_URL}/snapshots", timeout=30)
        assert r.status_code in (401, 403), r.status_code

    def test_last_month_requires_auth(self):
        r = requests.get(f"{BASE_URL}/snapshots/last-month", timeout=30)
        assert r.status_code in (401, 403), r.status_code


# ----------------------- Capture & schema -----------------------

class TestSnapshotCapture:
    def test_capture_returns_full_schema(self, client, account):
        r = client.post(f"{BASE_URL}/snapshots/capture", timeout=30)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        for k in ["snapshot_id", "user_id", "captured_at", "snapshot_type",
                  "total_balance", "total_assets", "total_liabilities",
                  "net_worth", "investment_value"]:
            assert k in d, f"missing key {k} in {d}"
        assert d["snapshot_type"] == "manual"
        assert isinstance(d["snapshot_id"], str) and d["snapshot_id"].startswith("snap_")
        # captured_at should be ISO-formatted
        datetime.fromisoformat(d["captured_at"].replace("Z", "+00:00"))
        # Math sanity: net_worth = assets - liabilities
        assert round(d["total_assets"] - d["total_liabilities"], 2) == round(d["net_worth"], 2), d

    def test_three_captures_persist(self, client):
        for _ in range(3):
            r = client.post(f"{BASE_URL}/snapshots/capture", timeout=30)
            assert r.status_code == 200, r.text[:200]
        r = client.get(f"{BASE_URL}/snapshots", timeout=30)
        assert r.status_code == 200
        d = r.json()
        manual = [s for s in d["snapshots"] if s.get("snapshot_type") == "manual"]
        # We did the schema test (1) + this 3 = at least 4
        assert len(manual) >= 4, f"expected >=4 manual snapshots, got {len(manual)}"

    def test_networth_math_with_account_balance(self, client, account):
        """positive account balance should reflect in total_assets / total_balance."""
        r = client.post(f"{BASE_URL}/snapshots/capture", timeout=30)
        assert r.status_code == 200
        d = r.json()
        # account initial_balance = 10000 -> total_balance >= 10000
        assert d["total_balance"] >= 10000, d
        # No investments, no loans, no CCs -> liabilities should be 0
        assert d["total_liabilities"] == 0, d
        # assets >= 10000 (account positive balance)
        assert d["total_assets"] >= 10000, d


# ----------------------- List & filter -----------------------

class TestSnapshotList:
    def test_list_returns_count_and_sorted_desc(self, client):
        r = client.get(f"{BASE_URL}/snapshots", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "count" in d and "snapshots" in d
        assert d["count"] == len(d["snapshots"])
        ts = [s["captured_at"] for s in d["snapshots"]]
        assert ts == sorted(ts, reverse=True), "snapshots not sorted newest-first"

    def test_filter_by_type_manual(self, client):
        r = client.get(f"{BASE_URL}/snapshots", params={"type": "manual"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert all(s["snapshot_type"] == "manual" for s in d["snapshots"]), \
            "non-manual snapshot leaked into ?type=manual"

    def test_filter_by_type_daily_safe(self, client):
        # No daily captures forced; result may legitimately be empty -> still 200.
        r = client.get(f"{BASE_URL}/snapshots", params={"type": "daily"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert all(s["snapshot_type"] == "daily" for s in d["snapshots"])


# ----------------------- /last-month behavior -----------------------

class TestLastMonthSnapshot:
    def test_404_when_no_prior_month_snapshot(self, client):
        # Brand-new user: only THIS month's manual snapshots exist
        r = client.get(f"{BASE_URL}/snapshots/last-month", timeout=30)
        assert r.status_code == 404, f"expected 404, got {r.status_code}: {r.text[:200]}"

    def test_returns_injected_prior_month(self, fresh_user, client):
        """Inject a snapshot dated to the previous month directly into Firestore
        and verify /last-month returns it."""
        now = datetime.now(timezone.utc)
        if now.month == 1:
            prior = datetime(now.year - 1, 12, 15, 12, 0, 0, tzinfo=timezone.utc)
        else:
            prior = datetime(now.year, now.month - 1, 15, 12, 0, 0, tzinfo=timezone.utc)

        injected = {
            "snapshot_id": f"snap_inject_{int(time.time())}",
            "user_id": fresh_user["user_id"],
            "captured_at": prior,
            "snapshot_type": "monthly",
            "total_balance": 50000.0,
            "total_assets": 50000.0,
            "total_liabilities": 0.0,
            "net_worth": 50000.0,
            "investment_value": 0.0,
        }
        asyncio.run(db.net_worth_snapshots.insert_one(injected))

        r = client.get(f"{BASE_URL}/snapshots/last-month", timeout=30)
        assert r.status_code == 200, r.text[:200]
        d = r.json()
        assert d["user_id"] == fresh_user["user_id"]
        assert d["net_worth"] == 50000.0
        assert d["snapshot_type"] == "monthly"


# ----------------------- Dashboard basis flag -----------------------

class TestDashboardSnapshotBasis:
    def test_basis_is_snapshot_when_prior_exists(self, fresh_user, client):
        """fresh_user already had a prior-month snapshot injected above
        (TestLastMonthSnapshot.test_returns_injected_prior_month). So dashboard
        should pick basis='snapshot' and compute delta_abs = total_balance - 50000."""
        # Make sure the injected snapshot exists; if tests ran out of order, inject now.
        last = client.get(f"{BASE_URL}/snapshots/last-month", timeout=30)
        if last.status_code == 404:
            now = datetime.now(timezone.utc)
            prior = (datetime(now.year - 1, 12, 15, 12, 0, 0, tzinfo=timezone.utc)
                     if now.month == 1
                     else datetime(now.year, now.month - 1, 15, 12, 0, 0, tzinfo=timezone.utc))
            asyncio.run(db.net_worth_snapshots.insert_one({
                "snapshot_id": f"snap_inject_{int(time.time())}_b",
                "user_id": fresh_user["user_id"],
                "captured_at": prior,
                "snapshot_type": "monthly",
                "total_balance": 50000.0,
                "total_assets": 50000.0,
                "total_liabilities": 0.0,
                "net_worth": 50000.0,
                "investment_value": 0.0,
            }))

        r = client.get(f"{BASE_URL}/dashboard", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("net_worth_delta_basis") == "snapshot", \
            f"expected 'snapshot', got {d.get('net_worth_delta_basis')}"
        # delta_abs = current total_balance - 50000 (prior net_worth)
        expected_delta = round(d["total_balance"] - 50000.0, 2)
        assert round(d["net_worth_delta_abs"], 2) == expected_delta, \
            f"delta_abs mismatch: got {d['net_worth_delta_abs']}, expected {expected_delta}"

    def test_basis_is_flow_approx_for_new_user(self):
        """A brand-new user with no prior-month snapshot must get basis='flow_approx'."""
        ts = int(time.time()) + 33
        email = f"flowapprox+{ts}@test.com"
        reg = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email,
            "password": "FlowAppr123!",
            "name": "FA",
            "mobile_number": f"96{ts % 100000000:08d}",
            "security_question": "Q?",
            "security_answer": "A",
        }, timeout=30)
        assert reg.status_code in (200, 201), reg.text[:200]
        h = {"Authorization": f"Bearer {reg.json()['access_token']}",
             "Content-Type": "application/json"}
        r = requests.get(f"{BASE_URL}/dashboard", headers=h, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d.get("net_worth_delta_basis") == "flow_approx", \
            f"expected 'flow_approx', got {d.get('net_worth_delta_basis')}"
