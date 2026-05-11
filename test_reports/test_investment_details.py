"""
Backend tests for Investment detail schema changes:
SaleDetails, MaturityDetails, WithdrawalDetails on create/update/get
"""
import pytest
import requests
import os

BASE_URL = "https://competent-haslett-9.preview.emergentagent.com"


@pytest.fixture(scope="module")
def auth_token():
    resp = requests.post(f"{BASE_URL}/api/auth/single-user")
    assert resp.status_code == 200, f"Auth failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


CREATED_IDS = []


def create_investment(headers, payload):
    resp = requests.post(f"{BASE_URL}/api/investments", json=payload, headers=headers)
    if resp.status_code == 200:
        inv_id = resp.json().get("investment_id")
        if inv_id:
            CREATED_IDS.append(inv_id)
    return resp


# ===== CREATE WITHOUT DETAILS =====

class TestCreateBasic:
    """Create investment without detail objects"""

    def test_create_no_details(self, headers):
        payload = {
            "name": "TEST_Basic Investment",
            "investment_type": "fd",
            "invested_amount": 10000.0,
            "current_value": 10500.0,
            "purchase_date": "2024-01-01",
            "status": "active"
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200, f"Expected 200 got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "investment_id" in data
        # detail fields should be None or absent
        assert data.get("sale_details") is None
        assert data.get("maturity_details") is None
        assert data.get("withdrawal_details") is None
        print("PASS: create without details")


# ===== CREATE WITH SALE DETAILS =====

class TestSaleDetails:
    """Tests for sale_details persistence"""

    def test_create_with_sale_details(self, headers):
        payload = {
            "name": "TEST_Stock with Sale",
            "investment_type": "stocks",
            "invested_amount": 50000.0,
            "current_value": 0.0,
            "purchase_date": "2023-06-01",
            "status": "closed",
            "sale_details": {
                "date_of_sale": "2024-03-15",
                "units_sold": 100.0,
                "sold_nav": 520.5,
                "amount_received": 52050.0,
                "tax_deducted": 1000.0
            }
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200, f"{resp.status_code}: {resp.text}"
        data = resp.json()
        sd = data.get("sale_details")
        assert sd is not None, "sale_details missing from response"
        assert sd.get("date_of_sale") == "2024-03-15"
        assert sd.get("units_sold") == 100.0
        assert sd.get("sold_nav") == 520.5
        assert sd.get("amount_received") == 52050.0
        assert sd.get("tax_deducted") == 1000.0
        print("PASS: sale_details all fields persisted")

    def test_get_sale_details_persisted(self, headers):
        """Create then GET to verify DB persistence"""
        payload = {
            "name": "TEST_Sale Persist Check",
            "investment_type": "mutual_funds",
            "invested_amount": 20000.0,
            "current_value": 0.0,
            "purchase_date": "2023-01-01",
            "status": "closed",
            "sale_details": {
                "date_of_sale": "2024-05-01",
                "units_sold": 50.0,
                "amount_received": 25000.0,
                "tax_deducted": 500.0
            }
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200
        inv_id = resp.json()["investment_id"]

        # GET
        get_resp = requests.get(f"{BASE_URL}/api/investments/{inv_id}", headers=headers)
        assert get_resp.status_code == 200, f"GET failed: {get_resp.text}"
        fetched = get_resp.json()
        sd = fetched.get("sale_details")
        assert sd is not None
        assert sd.get("date_of_sale") == "2024-05-01"
        assert sd.get("amount_received") == 25000.0
        print("PASS: sale_details persisted and retrieved via GET")


# ===== CREATE WITH MATURITY DETAILS =====

class TestMaturityDetails:
    """Tests for maturity_details persistence"""

    def test_create_with_maturity_details(self, headers):
        payload = {
            "name": "TEST_FD Matured",
            "investment_type": "fd",
            "invested_amount": 100000.0,
            "current_value": 0.0,
            "purchase_date": "2021-01-01",
            "status": "matured",
            "maturity_details": {
                "date_of_maturity": "2024-01-01",
                "maturity_amount": 120000.0,
                "tds_deducted": 2400.0
            }
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200, f"{resp.status_code}: {resp.text}"
        data = resp.json()
        md = data.get("maturity_details")
        assert md is not None, "maturity_details missing"
        assert md.get("date_of_maturity") == "2024-01-01"
        assert md.get("maturity_amount") == 120000.0
        assert md.get("tds_deducted") == 2400.0
        print("PASS: maturity_details all fields persisted")

    def test_get_maturity_details_persisted(self, headers):
        payload = {
            "name": "TEST_PPF Matured",
            "investment_type": "ppf",
            "invested_amount": 500000.0,
            "current_value": 0.0,
            "purchase_date": "2009-01-01",
            "status": "matured",
            "maturity_details": {
                "date_of_maturity": "2024-01-01",
                "maturity_amount": 1500000.0,
                "tds_deducted": 0.0,
                "renewed": False
            }
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200
        inv_id = resp.json()["investment_id"]

        get_resp = requests.get(f"{BASE_URL}/api/investments/{inv_id}", headers=headers)
        assert get_resp.status_code == 200
        md = get_resp.json().get("maturity_details")
        assert md is not None
        assert md.get("maturity_amount") == 1500000.0
        assert md.get("renewed") == False
        print("PASS: maturity_details (with renewed flag) persisted")


# ===== CREATE WITH WITHDRAWAL DETAILS =====

class TestWithdrawalDetails:
    """Tests for withdrawal_details persistence"""

    def test_create_with_withdrawal_details(self, headers):
        payload = {
            "name": "TEST_NPS Withdrawal",
            "investment_type": "nps",
            "invested_amount": 300000.0,
            "current_value": 0.0,
            "purchase_date": "2010-01-01",
            "status": "withdrawn",
            "withdrawal_details": {
                "date_of_withdrawal": "2024-06-01",
                "withdrawal_type": "full",
                "annuity_amount": 160000.0,
                "lumpsum_amount": 140000.0
            }
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200, f"{resp.status_code}: {resp.text}"
        data = resp.json()
        wd = data.get("withdrawal_details")
        assert wd is not None, "withdrawal_details missing"
        assert wd.get("date_of_withdrawal") == "2024-06-01"
        assert wd.get("withdrawal_type") == "full"
        assert wd.get("annuity_amount") == 160000.0
        assert wd.get("lumpsum_amount") == 140000.0
        print("PASS: withdrawal_details all fields persisted")

    def test_withdrawal_type_partial(self, headers):
        payload = {
            "name": "TEST_EPF Partial",
            "investment_type": "epf",
            "invested_amount": 200000.0,
            "current_value": 150000.0,
            "purchase_date": "2015-01-01",
            "status": "partially_withdrawn",
            "withdrawal_details": {
                "date_of_withdrawal": "2024-04-01",
                "withdrawal_type": "partial",
                "amount_received": 50000.0,
                "tax_deducted": 0.0
            }
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200, f"{resp.status_code}: {resp.text}"
        wd = resp.json().get("withdrawal_details")
        assert wd is not None
        assert wd.get("withdrawal_type") == "partial"
        assert wd.get("amount_received") == 50000.0
        print("PASS: withdrawal_type=partial persisted")

    def test_get_withdrawal_details_persisted(self, headers):
        payload = {
            "name": "TEST_PPF Partial Withdrawal",
            "investment_type": "ppf",
            "invested_amount": 400000.0,
            "current_value": 360000.0,
            "purchase_date": "2014-01-01",
            "status": "partially_withdrawn",
            "withdrawal_details": {
                "date_of_withdrawal": "2024-07-01",
                "withdrawal_type": "partial",
                "amount_received": 40000.0
            }
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200
        inv_id = resp.json()["investment_id"]

        get_resp = requests.get(f"{BASE_URL}/api/investments/{inv_id}", headers=headers)
        assert get_resp.status_code == 200
        wd = get_resp.json().get("withdrawal_details")
        assert wd is not None
        assert wd.get("withdrawal_type") == "partial"
        assert wd.get("amount_received") == 40000.0
        print("PASS: withdrawal_details GET persistence verified")


# ===== CREATE WITH ALL 3 DETAILS =====

class TestAllDetailsSimultaneously:
    """Create with all 3 detail objects at once"""

    def test_create_with_all_three_details(self, headers):
        payload = {
            "name": "TEST_All Details",
            "investment_type": "bonds",
            "invested_amount": 50000.0,
            "current_value": 0.0,
            "purchase_date": "2020-01-01",
            "status": "matured",
            "sale_details": {
                "date_of_sale": "2024-01-01",
                "amount_received": 55000.0,
                "tax_deducted": 500.0
            },
            "maturity_details": {
                "date_of_maturity": "2024-01-01",
                "maturity_amount": 55000.0,
                "tds_deducted": 500.0
            },
            "withdrawal_details": {
                "date_of_withdrawal": "2024-01-15",
                "withdrawal_type": "full",
                "amount_received": 54500.0
            }
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200, f"{resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("sale_details") is not None
        assert data.get("maturity_details") is not None
        assert data.get("withdrawal_details") is not None
        assert data["sale_details"]["amount_received"] == 55000.0
        assert data["maturity_details"]["maturity_amount"] == 55000.0
        assert data["withdrawal_details"]["withdrawal_type"] == "full"
        print("PASS: all 3 detail objects created and returned")


# ===== NPS BACKWARD COMPAT =====

class TestNPSBackwardCompat:
    """sale_details.date_of_withdrawal key (NPS compat)"""

    def test_sale_details_date_of_withdrawal_key(self, headers):
        payload = {
            "name": "TEST_NPS SaleDetails Compat",
            "investment_type": "nps",
            "invested_amount": 250000.0,
            "current_value": 0.0,
            "purchase_date": "2012-01-01",
            "status": "withdrawn",
            "sale_details": {
                "date_of_withdrawal": "2024-08-01",
                "amount_received": 280000.0
            }
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200, f"{resp.status_code}: {resp.text}"
        data = resp.json()
        sd = data.get("sale_details")
        assert sd is not None
        assert sd.get("date_of_withdrawal") == "2024-08-01"
        assert sd.get("amount_received") == 280000.0
        print("PASS: NPS compat date_of_withdrawal key accepted in sale_details")


# ===== UPDATE TESTS =====

class TestUpdateDetails:
    """PUT /api/investments/{id} - update detail objects"""

    def test_update_withdrawal_details(self, headers):
        # Create first
        payload = {
            "name": "TEST_Update Withdrawal",
            "investment_type": "nps",
            "invested_amount": 300000.0,
            "current_value": 300000.0,
            "purchase_date": "2011-01-01",
            "status": "active"
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200
        inv_id = resp.json()["investment_id"]

        # Update with withdrawal_details
        update = {
            "status": "withdrawn",
            "current_value": 0.0,
            "withdrawal_details": {
                "date_of_withdrawal": "2024-09-01",
                "withdrawal_type": "full",
                "annuity_amount": 120000.0,
                "lumpsum_amount": 180000.0
            }
        }
        put_resp = requests.put(f"{BASE_URL}/api/investments/{inv_id}", json=update, headers=headers)
        assert put_resp.status_code == 200, f"PUT failed: {put_resp.status_code}: {put_resp.text}"

        # GET to verify
        get_resp = requests.get(f"{BASE_URL}/api/investments/{inv_id}", headers=headers)
        assert get_resp.status_code == 200
        wd = get_resp.json().get("withdrawal_details")
        assert wd is not None
        assert wd.get("withdrawal_type") == "full"
        assert wd.get("annuity_amount") == 120000.0
        assert wd.get("lumpsum_amount") == 180000.0
        print("PASS: PUT withdrawal_details persisted correctly")

    def test_update_sale_details(self, headers):
        payload = {
            "name": "TEST_Update Sale",
            "investment_type": "mutual_funds",
            "invested_amount": 30000.0,
            "current_value": 35000.0,
            "purchase_date": "2022-01-01",
            "status": "active"
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200
        inv_id = resp.json()["investment_id"]

        update = {
            "status": "closed",
            "current_value": 0.0,
            "sale_details": {
                "date_of_sale": "2024-10-01",
                "units_sold": 200.0,
                "sold_nav": 175.0,
                "amount_received": 35000.0,
                "tax_deducted": 300.0
            }
        }
        put_resp = requests.put(f"{BASE_URL}/api/investments/{inv_id}", json=update, headers=headers)
        assert put_resp.status_code == 200, f"{put_resp.status_code}: {put_resp.text}"

        get_resp = requests.get(f"{BASE_URL}/api/investments/{inv_id}", headers=headers)
        sd = get_resp.json().get("sale_details")
        assert sd is not None
        assert sd.get("date_of_sale") == "2024-10-01"
        assert sd.get("amount_received") == 35000.0
        print("PASS: PUT sale_details persisted correctly")

    def test_update_maturity_details_with_renewal(self, headers):
        payload = {
            "name": "TEST_Update Maturity",
            "investment_type": "fd",
            "invested_amount": 50000.0,
            "current_value": 50000.0,
            "purchase_date": "2022-06-01",
            "status": "active"
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200
        inv_id = resp.json()["investment_id"]

        update = {
            "status": "matured",
            "maturity_details": {
                "date_of_maturity": "2024-06-01",
                "maturity_amount": 57500.0,
                "tds_deducted": 1150.0,
                "renewed": True,
                "renewal_investment_id": "inv_test_renewal_id"
            }
        }
        put_resp = requests.put(f"{BASE_URL}/api/investments/{inv_id}", json=update, headers=headers)
        assert put_resp.status_code == 200, f"{put_resp.status_code}: {put_resp.text}"

        get_resp = requests.get(f"{BASE_URL}/api/investments/{inv_id}", headers=headers)
        md = get_resp.json().get("maturity_details")
        assert md is not None
        assert md.get("renewed") == True
        assert md.get("renewal_investment_id") == "inv_test_renewal_id"
        print("PASS: PUT maturity_details with renewed+renewal_investment_id persisted")

    def test_update_nps_sale_details_date_of_withdrawal(self, headers):
        """NPS PUT: sale_details with date_of_withdrawal key"""
        payload = {
            "name": "TEST_NPS Update Compat",
            "investment_type": "nps",
            "invested_amount": 200000.0,
            "current_value": 200000.0,
            "purchase_date": "2013-01-01",
            "status": "active"
        }
        resp = create_investment(headers, payload)
        assert resp.status_code == 200
        inv_id = resp.json()["investment_id"]

        update = {
            "status": "withdrawn",
            "sale_details": {
                "date_of_withdrawal": "2024-11-01",
                "amount_received": 220000.0
            }
        }
        put_resp = requests.put(f"{BASE_URL}/api/investments/{inv_id}", json=update, headers=headers)
        assert put_resp.status_code == 200, f"{put_resp.status_code}: {put_resp.text}"

        get_resp = requests.get(f"{BASE_URL}/api/investments/{inv_id}", headers=headers)
        sd = get_resp.json().get("sale_details")
        assert sd is not None
        assert sd.get("date_of_withdrawal") == "2024-11-01"
        print("PASS: NPS compat PUT sale_details.date_of_withdrawal works")


# ===== EXISTING DATA STILL WORKS =====

class TestExistingInvestments:
    """Existing investments (without detail objects) still return correctly"""

    def test_get_existing_nps(self, headers):
        resp = requests.get(f"{BASE_URL}/api/investments/inv_548b2e367a11", headers=headers)
        assert resp.status_code == 200, f"GET NPS failed: {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("investment_id") == "inv_548b2e367a11"
        print(f"PASS: existing NPS investment returns correctly; sale_details={data.get('sale_details')}")

    def test_get_existing_ppf(self, headers):
        resp = requests.get(f"{BASE_URL}/api/investments/inv_3e4f962b7b4a", headers=headers)
        assert resp.status_code == 200, f"GET PPF failed: {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("investment_id") == "inv_3e4f962b7b4a"
        print(f"PASS: existing PPF investment returns correctly; maturity_details={data.get('maturity_details')}")

    def test_list_investments_works(self, headers):
        resp = requests.get(f"{BASE_URL}/api/investments", headers=headers)
        assert resp.status_code == 200, f"List failed: {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: GET /api/investments returns {len(data)} records")

    def test_dashboard_works(self, headers):
        resp = requests.get(f"{BASE_URL}/api/investments/dashboard", headers=headers)
        assert resp.status_code == 200, f"Dashboard failed: {resp.status_code}: {resp.text}"
        print("PASS: dashboard endpoint still works")


# ===== VALIDATION =====

class TestValidation:
    """Input validation"""

    def test_invalid_type_for_invested_amount(self, headers):
        payload = {
            "name": "TEST_Invalid",
            "investment_type": "fd",
            "invested_amount": "not_a_number",
            "current_value": 1000.0,
            "purchase_date": "2024-01-01"
        }
        resp = requests.post(f"{BASE_URL}/api/investments", json=payload, headers=headers)
        assert resp.status_code == 422, f"Expected 422 got {resp.status_code}"
        print("PASS: invalid invested_amount type returns 422")
