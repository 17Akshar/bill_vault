"""
Tests for Loans & EMIs API endpoints
Covers: dashboard, CRUD, prepayment, transactions
"""
import pytest
import requests
import os

BASE_URL = "https://fincare-loans-emi.preview.emergentagent.com"

def get_auth_headers():
    r = requests.post(f"{BASE_URL}/api/auth/single-user")
    token = r.json().get("access_token", "")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

HEADERS = get_auth_headers()

LOAN_PAYLOAD = {
    "name": "TEST_Home Loan HDFC",
    "loan_type": "home",
    "lender": "HDFC Bank",
    "principal_amount": 1500000,
    "interest_rate": 8.5,
    "emi_amount": 32750,
    "tenure_years": 20,
    "start_date": "2024-01-01T00:00:00Z",
    "status": "active",
}

created_loan_id = None


class TestLoansDashboard:
    """Dashboard summary stats"""

    def test_dashboard_returns_200(self):
        r = requests.get(f"{BASE_URL}/api/loans/dashboard", headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"

    def test_dashboard_has_required_fields(self):
        r = requests.get(f"{BASE_URL}/api/loans/dashboard", headers=HEADERS)
        data = r.json()
        for field in ["total_outstanding", "total_paid", "total_interest", "monthly_emi", "total_loans"]:
            assert field in data, f"Missing field: {field}"
        print(f"Dashboard: {data}")


class TestLoansCreate:
    """Create loan"""

    def test_create_loan_returns_200(self):
        global created_loan_id
        r = requests.post(f"{BASE_URL}/api/loans", json=LOAN_PAYLOAD, headers=HEADERS)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        data = r.json()
        assert "loan_id" in data
        assert data["name"] == LOAN_PAYLOAD["name"]
        assert data["principal_amount"] == LOAN_PAYLOAD["principal_amount"]
        created_loan_id = data["loan_id"]
        print(f"Created loan_id: {created_loan_id}")

    def test_list_loans_returns_created(self):
        if not created_loan_id:
            pytest.skip("No loan created")
        r = requests.get(f"{BASE_URL}/api/loans", headers=HEADERS)
        assert r.status_code == 200
        loans = r.json()
        assert any(l["loan_id"] == created_loan_id for l in loans), "Created loan not in list"

    def test_get_loan_by_id(self):
        if not created_loan_id:
            pytest.skip("No loan created")
        r = requests.get(f"{BASE_URL}/api/loans/{created_loan_id}", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert data["loan_id"] == created_loan_id


class TestLoansPrepayment:
    """Prepayment recording"""

    def test_prepayment_reduce_tenure(self):
        if not created_loan_id:
            pytest.skip("No loan created")
        payload = {
            "amount": 100000,
            "date": "2024-06-01T00:00:00Z",
            "prepayment_type": "reduce_tenure",
        }
        r = requests.post(f"{BASE_URL}/api/loans/{created_loan_id}/prepayment", json=payload, headers=HEADERS)
        assert r.status_code == 200, f"{r.status_code}: {r.text}"
        data = r.json()
        assert "new_outstanding" in data
        assert data["new_outstanding"] < LOAN_PAYLOAD["principal_amount"]

    def test_prepayment_reduce_emi(self):
        if not created_loan_id:
            pytest.skip("No loan created")
        payload = {
            "amount": 50000,
            "date": "2024-07-01T00:00:00Z",
            "prepayment_type": "reduce_emi",
        }
        r = requests.post(f"{BASE_URL}/api/loans/{created_loan_id}/prepayment", json=payload, headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "new_emi" in data


class TestLoansTransactions:
    """EMI transactions"""

    def test_mark_emi_paid(self):
        if not created_loan_id:
            pytest.skip("No loan created")
        payload = {
            "amount": 32750,
            "payment_date": "2024-02-05T00:00:00Z",
            "payment_type": "emi",
        }
        r = requests.post(f"{BASE_URL}/api/loans/{created_loan_id}/transactions", json=payload, headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "loan_txn_id" in data

    def test_get_transactions(self):
        if not created_loan_id:
            pytest.skip("No loan created")
        r = requests.get(f"{BASE_URL}/api/loans/{created_loan_id}/transactions", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "transactions" in data
        assert "prepayments" in data


class TestLoansDelete:
    """Soft delete loan"""

    def test_delete_loan(self):
        if not created_loan_id:
            pytest.skip("No loan created")
        r = requests.delete(f"{BASE_URL}/api/loans/{created_loan_id}", headers=HEADERS)
        assert r.status_code == 200
        data = r.json()
        assert "message" in data

    def test_deleted_loan_not_in_list(self):
        if not created_loan_id:
            pytest.skip("No loan created")
        r = requests.get(f"{BASE_URL}/api/loans", headers=HEADERS)
        assert r.status_code == 200
        loans = r.json()
        assert not any(l["loan_id"] == created_loan_id for l in loans), "Deleted loan still visible"
