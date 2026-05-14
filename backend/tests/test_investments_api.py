"""
Investments API tests (P0+P1)
- /api/auth/single-user bootstrap
- /api/investments dashboard, list, filter, detail, CRUD, transactions
- Multi-record persistence verification
"""
import os
import time
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL"
) or "https://fincare-db-redesign.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")


@pytest.fixture(scope="session")
def auth_token():
    r = requests.post(f"{BASE_URL}/api/auth/single-user", json={}, timeout=30)
    if r.status_code != 200:
        pytest.skip(f"Auth bootstrap failed: {r.status_code} {r.text[:200]}")
    tok = r.json().get("access_token")
    if not tok:
        pytest.skip("No access_token in single-user response")
    return tok


@pytest.fixture(scope="session")
def client(auth_token):
    s = requests.Session()
    s.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    })
    return s


# --------------------------- Dashboard ---------------------------
class TestDashboard:
    def test_dashboard_shape_and_totals(self, client):
        r = client.get(f"{BASE_URL}/api/investments/dashboard", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        # Required keys
        for k in ["total_invested", "total_current_value", "total_gain_loss",
                  "gain_loss_percentage", "asset_allocation", "top_performers",
                  "top_losers", "total_dividends", "transaction_summary"]:
            assert k in d, f"missing key {k}"

        # Seed: 13 investments, ₹27,57,375 total_current_value, +18.24% gain
        assert d["total_current_value"] >= 1_000_000, "current_value too small; seed missing?"
        assert isinstance(d["asset_allocation"], dict)
        assert "by_type" in d["asset_allocation"]
        assert "by_group" in d["asset_allocation"]
        assert isinstance(d["asset_allocation"]["by_type"], list)
        assert len(d["asset_allocation"]["by_type"]) >= 1

        # gain_loss math
        diff = d["total_current_value"] - d["total_invested"]
        assert abs(diff - d["total_gain_loss"]) < 1.0
        if d["total_invested"] > 0:
            pct = diff / d["total_invested"] * 100
            assert abs(pct - d["gain_loss_percentage"]) < 0.5

        # top_performers structure
        assert isinstance(d["top_performers"], list)
        for p in d["top_performers"]:
            assert "name" in p
            assert "type" in p
            assert "gain_loss_percentage" in p

        # transaction_summary structure
        ts = d["transaction_summary"]
        for k in ["total", "buy", "sell", "dividend"]:
            assert k in ts


# --------------------------- List + Filter ---------------------------
class TestListFilter:
    def test_list_all(self, client):
        r = client.get(f"{BASE_URL}/api/investments", timeout=30)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1
        for it in items[:3]:
            assert "investment_id" in it
            assert "investment_type" in it
            assert "_id" not in it  # mongo objectid suppressed

    def test_filter_stocks(self, client):
        r = client.get(f"{BASE_URL}/api/investments?investment_type=stocks", timeout=30)
        assert r.status_code == 200, r.text
        items = r.json()
        assert isinstance(items, list)
        for it in items:
            assert it.get("investment_type") == "stocks"


# --------------------------- Detail with metrics ---------------------------
class TestDetail:
    def test_detail_with_metrics_and_transactions(self, client):
        # find a stock investment that has transactions in the seed (9 txns / 4 invs)
        r = client.get(f"{BASE_URL}/api/investments?investment_type=stocks", timeout=30)
        assert r.status_code == 200
        stocks = r.json()
        assert len(stocks) >= 1
        # Pick the one with the most transactions
        best = None
        best_count = -1
        for s in stocks:
            inv_id = s["investment_id"]
            d = client.get(f"{BASE_URL}/api/investments/{inv_id}", timeout=30).json()
            if isinstance(d, dict) and "metrics" in d:
                c = d["metrics"]["transaction_count"]
                if c > best_count:
                    best_count, best = c, d
        assert best is not None
        # required fields
        assert "transactions" in best
        assert "metrics" in best
        m = best["metrics"]
        for k in ["gain_loss", "gain_loss_percentage", "total_dividends",
                  "buy_count", "sell_count", "transaction_count"]:
            assert k in m
        # math sanity
        if best.get("invested_amount", 0) > 0:
            pct = (best["current_value"] - best["invested_amount"]) / best["invested_amount"] * 100
            assert abs(pct - m["gain_loss_percentage"]) < 0.5
        # if any txn exists, transaction_count > 0
        assert m["transaction_count"] == len(best["transactions"])

    def test_detail_404_for_unknown(self, client):
        r = client.get(f"{BASE_URL}/api/investments/inv_does_not_exist_xx", timeout=30)
        assert r.status_code == 404


# --------------------------- CRUD ---------------------------
class TestCRUD:
    def test_create_update_delete_flow(self, client):
        payload = {
            "name": "TEST_INV_AAPL",
            "investment_type": "stocks",
            "invested_amount": 10000.0,
            "current_value": 12000.0,
            "purchase_date": datetime(2024, 1, 15, tzinfo=timezone.utc).isoformat(),
            "notes": "TEST_seed",
        }
        cr = client.post(f"{BASE_URL}/api/investments", json=payload, timeout=30)
        assert cr.status_code in (200, 201), cr.text
        body = cr.json()
        assert body["name"] == "TEST_INV_AAPL"
        assert body["investment_type"] == "stocks"
        assert body["is_active"] is True
        assert "investment_id" in body
        inv_id = body["investment_id"]
        assert "_id" not in body

        # GET verify persistence
        gr = client.get(f"{BASE_URL}/api/investments/{inv_id}", timeout=30)
        assert gr.status_code == 200
        assert gr.json()["name"] == "TEST_INV_AAPL"

        # UPDATE
        up = client.put(
            f"{BASE_URL}/api/investments/{inv_id}",
            json={"name": "TEST_INV_AAPL_UPDATED", "current_value": 13500.0,
                  "notes": "TEST_updated"},
            timeout=30,
        )
        assert up.status_code == 200, up.text
        # GET verify update
        gr2 = client.get(f"{BASE_URL}/api/investments/{inv_id}", timeout=30)
        assert gr2.status_code == 200
        ub = gr2.json()
        assert ub["name"] == "TEST_INV_AAPL_UPDATED"
        assert abs(ub["current_value"] - 13500.0) < 0.01

        # DELETE (soft)
        dr = client.delete(f"{BASE_URL}/api/investments/{inv_id}", timeout=30)
        assert dr.status_code == 200, dr.text
        # After soft-delete, list should not include it
        time.sleep(1)
        ls = client.get(f"{BASE_URL}/api/investments", timeout=30).json()
        ids = [i["investment_id"] for i in ls]
        assert inv_id not in ids


# --------------------------- Transactions multi-record persistence ---------------------------
class TestTransactionsPersistence:
    def test_add_multiple_transactions_no_overwrite(self, client):
        # Create a fresh inv
        payload = {
            "name": "TEST_INV_TXN_PERSIST",
            "investment_type": "stocks",
            "invested_amount": 5000.0,
            "current_value": 5000.0,
            "purchase_date": datetime(2024, 6, 1, tzinfo=timezone.utc).isoformat(),
        }
        cr = client.post(f"{BASE_URL}/api/investments", json=payload, timeout=30)
        assert cr.status_code in (200, 201)
        inv_id = cr.json()["investment_id"]

        # Add 3 transactions
        txns = [
            {"transaction_type": "buy", "amount": 1000.0, "quantity": 10, "price_per_unit": 100,
             "transaction_date": datetime(2024, 6, 5, tzinfo=timezone.utc).isoformat()},
            {"transaction_type": "buy", "amount": 1500.0, "quantity": 10, "price_per_unit": 150,
             "transaction_date": datetime(2024, 6, 10, tzinfo=timezone.utc).isoformat()},
            {"transaction_type": "dividend", "amount": 50.0,
             "transaction_date": datetime(2024, 7, 1, tzinfo=timezone.utc).isoformat()},
        ]
        created_ids = []
        for t in txns:
            r = client.post(f"{BASE_URL}/api/investments/{inv_id}/transactions",
                            json=t, timeout=30)
            assert r.status_code in (200, 201), r.text
            body = r.json()
            assert "transaction_id" in body
            created_ids.append(body["transaction_id"])
        # All transaction_ids must be unique
        assert len(set(created_ids)) == 3, f"duplicate ids? {created_ids}"

        # GET transactions list
        gr = client.get(f"{BASE_URL}/api/investments/{inv_id}/transactions", timeout=30)
        assert gr.status_code == 200, gr.text
        got = gr.json()
        assert isinstance(got, list)
        got_ids = {t["transaction_id"] for t in got}
        # All 3 must be present (this is the multirecord-overwrite regression)
        for cid in created_ids:
            assert cid in got_ids, f"missing txn {cid}; got {got_ids}"

        # Cleanup
        client.delete(f"{BASE_URL}/api/investments/{inv_id}", timeout=30)

    def test_seed_transactions_present(self, client):
        # Verify multi-record persistence: create an investment, add 2 txns, ensure both return
        inv_id = client.post(f"{BASE_URL}/api/investments",
                             json={"investment_type": "stocks", "name": "MULTI_TX_TEST",
                                   "invested_amount": 1000, "current_value": 1000,
                                   "purchase_date": "2024-01-01T00:00:00"},
                             timeout=30).json()["investment_id"]
        client.post(f"{BASE_URL}/api/investments/{inv_id}/transactions",
                    json={"transaction_type": "buy", "quantity": 10, "price_per_unit": 100,
                          "amount": 1000,
                          "transaction_date": "2024-01-01T00:00:00"},
                    timeout=30)
        client.post(f"{BASE_URL}/api/investments/{inv_id}/transactions",
                    json={"transaction_type": "buy", "quantity": 5, "price_per_unit": 110,
                          "amount": 550,
                          "transaction_date": "2024-02-01T00:00:00"},
                    timeout=30)
        txns = client.get(f"{BASE_URL}/api/investments/{inv_id}/transactions",
                          timeout=30).json()
        assert len(txns) >= 2, f"Multi-record bug regressed; got {len(txns)} txns"
        client.delete(f"{BASE_URL}/api/investments/{inv_id}", timeout=30)
