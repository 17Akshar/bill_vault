"""
Tests for Loan Detail Screen Features:
- GET /api/loans — list loans
- GET /api/loans/{id}/analytics — 7 calculations
- GET /api/loans/{id}/emi-schedule — EMI schedule rows
- GET /api/loans/{id}/prepayments — list prepayments
- POST /api/loans/{id}/transactions — record EMI payment
- POST /api/loans/{id}/prepayments — record prepayment
- PUT /api/emi-reminders/{id} — mark EMI paid
- GET /api/loans/{id}/amortization — full schedule
"""
import pytest
import requests
import os

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def token():
    resp = requests.post(f"{BASE_URL}/api/auth/single-user")
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def loan_id(headers):
    """Get first active loan id."""
    resp = requests.get(f"{BASE_URL}/api/loans", headers=headers)
    assert resp.status_code == 200
    loans = resp.json()
    assert len(loans) > 0, "No loans found — seed 'Home Loan - HDFC Bank'"
    return loans[0]["loan_id"]


# ── Core loan list ──────────────────────────────────────────────────────────

class TestLoansList:
    def test_get_loans_200(self, headers):
        resp = requests.get(f"{BASE_URL}/api/loans", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_get_loans_fields(self, headers):
        resp = requests.get(f"{BASE_URL}/api/loans", headers=headers)
        loan = resp.json()[0]
        for field in ("loan_id", "name", "loan_type", "principal_amount", "outstanding_amount", "emi_amount"):
            assert field in loan, f"Missing field: {field}"


# ── Analytics ──────────────────────────────────────────────────────────────

class TestLoanAnalytics:
    def test_analytics_200(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/analytics", headers=headers)
        assert resp.status_code == 200

    def test_analytics_7_keys(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/analytics", headers=headers)
        data = resp.json()
        required_keys = [
            "outstanding_balance",
            "emi_tracking",
            "interest_paid",
            "interest_remaining",
            "completion_percentage",
            "prepayment_impact",
            "interest_saved",
        ]
        for k in required_keys:
            assert k in data, f"Missing analytics key: {k}"

    def test_analytics_emi_tracking_fields(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/analytics", headers=headers)
        et = resp.json()["emi_tracking"]
        for k in ("emi_amount", "emis_paid", "emis_remaining", "tenure_months"):
            assert k in et, f"Missing emi_tracking key: {k}"

    def test_analytics_prepayment_impact(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/analytics", headers=headers)
        pi = resp.json()["prepayment_impact"]
        assert "total_prepayments_count" in pi


# ── EMI Schedule ───────────────────────────────────────────────────────────

class TestEMISchedule:
    def test_emi_schedule_200(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/emi-schedule", headers=headers)
        assert resp.status_code == 200

    def test_emi_schedule_is_list(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/emi-schedule", headers=headers)
        data = resp.json()
        assert isinstance(data, list)

    def test_emi_schedule_generate_then_fetch(self, headers, loan_id):
        """Generate if empty, then verify rows exist."""
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/emi-schedule", headers=headers)
        if len(resp.json()) == 0:
            gen = requests.post(f"{BASE_URL}/api/loans/{loan_id}/emi-schedule", headers=headers)
            assert gen.status_code == 200
            resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/emi-schedule", headers=headers)
        rows = resp.json()
        if rows:
            row = rows[0]
            for k in ("emi_number", "due_date", "emi_amount", "status"):
                assert k in row, f"Missing EMI schedule key: {k}"


# ── Prepayments ────────────────────────────────────────────────────────────

class TestPrepayments:
    def test_get_prepayments_200(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/prepayments", headers=headers)
        assert resp.status_code == 200

    def test_get_prepayments_is_list(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/prepayments", headers=headers)
        assert isinstance(resp.json(), list)

    def test_record_and_delete_prepayment(self, headers, loan_id):
        """Record a part prepayment and verify balance update, then delete."""
        # Get current outstanding
        loan_before = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=headers).json()
        outstanding_before = float(loan_before["outstanding_amount"])

        payload = {
            "payment_date": "2025-01-15",
            "amount": 10000,
            "prepayment_type": "part_prepayment",
            "adjustment_type": "reduce_tenure",
            "penalty_rate": 0,
            "payment_method": "bank_transfer",
        }
        resp = requests.post(f"{BASE_URL}/api/loans/{loan_id}/prepayments", json=payload, headers=headers)
        assert resp.status_code == 200, f"Prepayment failed: {resp.text}"
        data = resp.json()
        assert "prepayment_id" in data
        assert data["outstanding_after"] == round(outstanding_before - 10000, 2)

        pid = data["prepayment_id"]

        # Verify loan outstanding updated
        loan_after = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=headers).json()
        assert float(loan_after["outstanding_amount"]) == data["outstanding_after"]

        # Cleanup
        del_resp = requests.delete(f"{BASE_URL}/api/loan-prepayments/{pid}", headers=headers)
        assert del_resp.status_code == 200


# ── Transactions (EMI payment) ─────────────────────────────────────────────

class TestLoanTransactions:
    def test_record_emi_payment(self, headers, loan_id):
        """Record an EMI payment and verify loan counters update."""
        loan_before = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=headers).json()
        emis_paid_before = int(loan_before.get("emis_paid", 0))

        payload = {
            "transaction_type": "emi",
            "transaction_date": "2025-01-15",
            "amount": float(loan_before["emi_amount"]),
            "payment_method": "upi",
        }
        resp = requests.post(f"{BASE_URL}/api/loans/{loan_id}/transactions", json=payload, headers=headers)
        assert resp.status_code == 200, f"EMI record failed: {resp.text}"
        data = resp.json()
        assert "loan_transaction_id" in data
        assert data["transaction_type"] == "emi"

        # Verify loan emis_paid incremented
        loan_after = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=headers).json()
        assert int(loan_after["emis_paid"]) == emis_paid_before + 1

        # Cleanup
        tid = data["loan_transaction_id"]
        del_resp = requests.delete(f"{BASE_URL}/api/loan-transactions/{tid}", headers=headers)
        assert del_resp.status_code == 200


# ── EMI Reminder mark paid ─────────────────────────────────────────────────

class TestEMIReminders:
    def test_mark_emi_reminder_paid(self, headers, loan_id):
        """Generate schedule, mark first pending row as paid, verify status."""
        # Ensure schedule exists
        schedule = requests.get(f"{BASE_URL}/api/loans/{loan_id}/emi-schedule", headers=headers).json()
        if not schedule:
            requests.post(f"{BASE_URL}/api/loans/{loan_id}/emi-schedule", headers=headers)
            schedule = requests.get(f"{BASE_URL}/api/loans/{loan_id}/emi-schedule", headers=headers).json()

        if not schedule:
            pytest.skip("No EMI schedule rows available")

        # Find a pending row
        pending = next((r for r in schedule if r.get("status") == "pending"), None)
        if not pending:
            pytest.skip("No pending EMI rows to mark paid")

        rid = pending.get("emi_reminder_id")
        assert rid, "emi_reminder_id missing from schedule row"

        resp = requests.put(
            f"{BASE_URL}/api/emi-reminders/{rid}",
            json={"status": "paid", "paid_date": "2025-01-15", "paid_amount": float(pending["emi_amount"])},
            headers=headers,
        )
        assert resp.status_code == 200, f"Mark paid failed: {resp.text}"
        assert resp.json()["status"] == "paid"

        # Restore
        requests.put(f"{BASE_URL}/api/emi-reminders/{rid}", json={"status": "pending"}, headers=headers)


# ── Amortization ───────────────────────────────────────────────────────────

class TestAmortization:
    def test_amortization_200(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/amortization", headers=headers)
        assert resp.status_code == 200

    def test_amortization_schedule_count(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/amortization", headers=headers)
        data = resp.json()
        assert "schedule" in data
        loan = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=headers).json()
        tenure = int(loan["tenure_months"])
        assert len(data["schedule"]) == tenure, f"Expected {tenure} rows, got {len(data['schedule'])}"

    def test_amortization_fields(self, headers, loan_id):
        resp = requests.get(f"{BASE_URL}/api/loans/{loan_id}/amortization", headers=headers)
        data = resp.json()
        assert "total_interest" in data and "total_payment" in data
        if data["schedule"]:
            row = data["schedule"][0]
            for k in ("emi_number", "due_date", "emi_amount", "principal_component", "interest_component", "balance_after"):
                assert k in row
