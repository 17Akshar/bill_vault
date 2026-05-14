"""
Loans & EMIs Module — Backend API Tests
Tests: GET /loans, POST /loans, GET /loans/{id}/analytics, GET /loans/{id}/amortization,
       POST /loans/{id}/transactions, GET /loans/summary
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")


@pytest.fixture(scope="module")
def auth_token():
    resp = requests.post(f"{BASE_URL}/api/auth/single-user")
    if resp.status_code == 200:
        return resp.json().get("access_token")
    pytest.skip(f"Auth failed: {resp.status_code} {resp.text}")


@pytest.fixture(scope="module")
def client(auth_token):
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json",
    })
    return session


@pytest.fixture(scope="module")
def test_loan_id(client):
    """Create a test loan and return its ID."""
    payload = {
        "name": "TEST_Home Loan",
        "loan_type": "home",
        "lender_name": "TEST_Bank",
        "principal_amount": 1000000.0,
        "interest_rate": 8.5,
        "tenure_months": 120,
        "start_date": "2024-01-01",
    }
    resp = client.post(f"{BASE_URL}/api/loans", json=payload)
    assert resp.status_code == 200, f"Failed to create loan: {resp.text}"
    data = resp.json()
    assert "loan_id" in data
    yield data["loan_id"]
    # Cleanup
    client.delete(f"{BASE_URL}/api/loans/{data['loan_id']}")


class TestGetLoans:
    """GET /api/loans"""

    def test_list_loans_returns_200(self, client):
        resp = client.get(f"{BASE_URL}/api/loans")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_loans_have_required_fields(self, client, test_loan_id):
        resp = client.get(f"{BASE_URL}/api/loans")
        data = resp.json()
        loan = next((l for l in data if l["loan_id"] == test_loan_id), None)
        assert loan is not None
        assert "principal_amount" in loan
        assert "outstanding_amount" in loan
        assert "emi_amount" in loan
        assert "tenure_months" in loan


class TestCreateLoan:
    """POST /api/loans"""

    def test_create_loan_basic(self, client):
        payload = {
            "name": "TEST_Car Loan",
            "loan_type": "car",
            "principal_amount": 500000.0,
            "interest_rate": 9.5,
            "tenure_months": 60,
            "start_date": "2024-06-01",
        }
        resp = client.post(f"{BASE_URL}/api/loans", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "TEST_Car Loan"
        assert data["loan_type"] == "car"
        assert data["principal_amount"] == 500000.0
        assert data["emi_amount"] > 0  # auto-computed
        assert data["outstanding_amount"] == 500000.0
        # Cleanup
        client.delete(f"{BASE_URL}/api/loans/{data['loan_id']}")

    def test_create_loan_emi_auto_computed(self, client):
        """EMI should be auto-computed if not provided."""
        payload = {
            "name": "TEST_Personal Loan",
            "loan_type": "personal",
            "principal_amount": 300000.0,
            "interest_rate": 12.0,
            "tenure_months": 36,
            "start_date": "2024-01-01",
        }
        resp = client.post(f"{BASE_URL}/api/loans", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        # Expected EMI for 3L @ 12% for 36 months ≈ 9964
        assert 9000 < data["emi_amount"] < 11000, f"Unexpected EMI: {data['emi_amount']}"
        client.delete(f"{BASE_URL}/api/loans/{data['loan_id']}")

    def test_create_loan_missing_required_fields(self, client):
        resp = client.post(f"{BASE_URL}/api/loans", json={"name": "Missing Fields"})
        assert resp.status_code == 422


class TestLoanAnalytics:
    """GET /api/loans/{loan_id}/analytics"""

    def test_analytics_returns_200(self, client, test_loan_id):
        resp = client.get(f"{BASE_URL}/api/loans/{test_loan_id}/analytics")
        assert resp.status_code == 200

    def test_analytics_has_all_7_calculations(self, client, test_loan_id):
        resp = client.get(f"{BASE_URL}/api/loans/{test_loan_id}/analytics")
        data = resp.json()
        # 1. Outstanding balance
        assert "outstanding_balance" in data
        assert isinstance(data["outstanding_balance"], (int, float))
        # 2. EMI tracking
        assert "emi_tracking" in data
        et = data["emi_tracking"]
        assert "emi_amount" in et
        assert "emis_paid" in et
        assert "emis_remaining" in et
        # 3. Interest paid
        assert "interest_paid" in data
        # 4. Interest remaining
        assert "interest_remaining" in data
        # 5. Completion percentage
        assert "completion_percentage" in data
        assert 0 <= data["completion_percentage"] <= 100
        # 6. Prepayment impact
        assert "prepayment_impact" in data
        # 7. Interest saved
        assert "interest_saved" in data

    def test_analytics_outstanding_equals_principal_for_new_loan(self, client, test_loan_id):
        resp = client.get(f"{BASE_URL}/api/loans/{test_loan_id}/analytics")
        data = resp.json()
        # New loan: outstanding = principal
        assert data["outstanding_balance"] == data["principal_amount"]
        assert data["completion_percentage"] == 0.0

    def test_analytics_404_for_unknown_loan(self, client):
        resp = client.get(f"{BASE_URL}/api/loans/nonexistent_loan_id/analytics")
        assert resp.status_code == 404


class TestLoanAmortization:
    """GET /api/loans/{loan_id}/amortization"""

    def test_amortization_returns_200(self, client, test_loan_id):
        resp = client.get(f"{BASE_URL}/api/loans/{test_loan_id}/amortization")
        assert resp.status_code == 200

    def test_amortization_has_correct_row_count(self, client, test_loan_id):
        resp = client.get(f"{BASE_URL}/api/loans/{test_loan_id}/amortization")
        data = resp.json()
        schedule = data.get("schedule", data)  # may be wrapped or raw list
        if isinstance(schedule, list):
            assert len(schedule) == 120  # tenure_months
        else:
            assert "schedule" in data

    def test_amortization_row_structure(self, client, test_loan_id):
        resp = client.get(f"{BASE_URL}/api/loans/{test_loan_id}/amortization")
        data = resp.json()
        schedule = data.get("schedule", data) if isinstance(data, dict) else data
        if isinstance(schedule, list) and len(schedule) > 0:
            row = schedule[0]
            assert "emi_number" in row
            assert "principal_component" in row
            assert "interest_component" in row
            assert "balance_after" in row


class TestLoanTransactions:
    """POST /api/loans/{loan_id}/transactions"""

    def test_record_emi_transaction(self, client, test_loan_id):
        # First get analytics to know EMI amount
        analytics = client.get(f"{BASE_URL}/api/loans/{test_loan_id}/analytics").json()
        emi_amount = analytics["emi_tracking"]["emi_amount"]

        payload = {
            "transaction_type": "emi",
            "transaction_date": "2024-02-01T00:00:00Z",
            "amount": emi_amount,
        }
        resp = client.post(f"{BASE_URL}/api/loans/{test_loan_id}/transactions", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["transaction_type"] == "emi"
        assert data["loan_id"] == test_loan_id
        assert "principal_component" in data
        assert "interest_component" in data
        assert data["principal_component"] > 0
        assert data["interest_component"] > 0

    def test_loan_counters_update_after_transaction(self, client, test_loan_id):
        """After EMI, emis_paid should have incremented."""
        analytics = client.get(f"{BASE_URL}/api/loans/{test_loan_id}/analytics").json()
        # At least 1 EMI was paid in previous test
        assert analytics["emi_tracking"]["emis_paid"] >= 1
        # Outstanding should be less than principal
        assert analytics["outstanding_balance"] < analytics["principal_amount"]

    def test_record_transaction_404_for_unknown_loan(self, client):
        payload = {
            "transaction_type": "emi",
            "transaction_date": "2024-02-01T00:00:00Z",
            "amount": 10000,
        }
        resp = client.post(f"{BASE_URL}/api/loans/nonexistent_loan/transactions", json=payload)
        assert resp.status_code == 404


class TestLoansSummary:
    """GET /api/loans/summary"""

    def test_summary_returns_200(self, client):
        resp = client.get(f"{BASE_URL}/api/loans/summary")
        assert resp.status_code == 200

    def test_summary_has_portfolio_fields(self, client):
        resp = client.get(f"{BASE_URL}/api/loans/summary")
        data = resp.json()
        assert "total_loans" in data
        assert "total_outstanding" in data
        assert "monthly_emi_total" in data or "total_monthly_emi" in data or "monthly_emi_burden" in data

    def test_summary_totals_are_numeric(self, client):
        resp = client.get(f"{BASE_URL}/api/loans/summary")
        data = resp.json()
        assert isinstance(data["total_loans"], int)
        assert isinstance(data["total_outstanding"], (int, float))
