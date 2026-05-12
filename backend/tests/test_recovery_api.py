"""
Account Recovery API tests.

Covers /api/recovery/* endpoints:
  - POST /api/recovery/status
  - POST /api/recovery/password/email   (rate-limited, no enumeration)
  - POST /api/recovery/password/phone/verify (password policy, token verification)
  - POST /api/recovery/email/reveal     (masked email reveal, no enumeration)

Also runs quick regression on /api/auth/forgot-password and /api/auth/reset-password
for backward compatibility.
"""
import time
import uuid
import pytest
import requests

BASE_URL = "https://competent-haslett-9.preview.emergentagent.com/api"


# Helper: unique identifier for each test run
def _unique_email(label: str = "rl") -> str:
    return f"{label}_{uuid.uuid4().hex[:8]}@test.com"


# ---------------- /api/recovery/status ----------------
class TestRecoveryStatus:
    def test_status_for_fresh_identifier(self):
        ident = _unique_email("fresh")
        r = requests.post(f"{BASE_URL}/recovery/status",
                          json={"identifier": ident}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        # All required keys present
        assert "blocked" in data and "remaining" in data and "blocked_until" in data
        assert data["blocked"] is False
        assert data["remaining"] == 5
        assert data["blocked_until"] is None

    def test_status_after_attempts(self):
        ident = _unique_email("status_attempts")
        # Make 2 attempts via password/email
        for _ in range(2):
            requests.post(f"{BASE_URL}/recovery/password/email",
                          json={"email": ident}, timeout=30)
        r = requests.post(f"{BASE_URL}/recovery/status",
                          json={"identifier": ident}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["blocked"] is False
        # remaining should now be 3 (5 - 2)
        assert d["remaining"] == 3, f"expected remaining=3 after 2 attempts, got {d}"


# ---------------- /api/recovery/password/email (rate limit + no-enumeration) ----------------
class TestPasswordEmailRecovery:
    def test_no_enumeration_message_for_random_email(self):
        ident = _unique_email("noenum")
        r = requests.post(f"{BASE_URL}/recovery/password/email",
                          json={"email": ident}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "If an account exists" in data.get("message", "")
        assert "remaining_attempts" in data

    def test_same_message_for_existing_user(self):
        # fulltest@test.com is the seeded test user
        r = requests.post(f"{BASE_URL}/recovery/password/email",
                          json={"email": "fulltest@test.com"}, timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "If an account exists" in data.get("message", ""), \
            "Should NOT reveal whether account exists"

    def test_rate_limit_5_attempts_then_429(self):
        """
        6th attempt within the 15-min window must return 429
        with 'Too many attempts. Blocked for 30 minutes.'
        """
        ident = _unique_email("ratelimit")
        # First 5 attempts must all return 200
        for i in range(5):
            r = requests.post(f"{BASE_URL}/recovery/password/email",
                              json={"email": ident}, timeout=30)
            assert r.status_code == 200, f"attempt {i+1} got {r.status_code}: {r.text}"

        # 6th attempt must hit rate limit -> 429
        r = requests.post(f"{BASE_URL}/recovery/password/email",
                         json={"email": ident}, timeout=30)
        assert r.status_code == 429, f"expected 429 on 6th attempt, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        assert "Too many attempts" in detail
        assert "30" in detail or "blocked" in detail.lower()

        # status endpoint should now report blocked=True
        s = requests.post(f"{BASE_URL}/recovery/status",
                          json={"identifier": ident}, timeout=30)
        assert s.status_code == 200
        sd = s.json()
        assert sd["blocked"] is True
        assert sd["blocked_until"] is not None
        assert sd["remaining"] == 0

    def test_email_validation(self):
        # Empty / too short email - pydantic min_length=3 should reject
        r = requests.post(f"{BASE_URL}/recovery/password/email",
                          json={"email": ""}, timeout=30)
        assert r.status_code == 422


# ---------------- /api/recovery/password/phone/verify ----------------
class TestPhonePasswordReset:
    """All happy paths require a real Firebase Phone ID token (SMS).
    Backend logic for token verification + password policy is tested with
    invalid tokens and weak passwords."""

    def test_password_too_short_pydantic_422(self):
        r = requests.post(f"{BASE_URL}/recovery/password/phone/verify",
                          json={"firebase_id_token": "x" * 25,
                                "new_password": "Ab1"}, timeout=30)
        # pydantic min_length=8 -> 422
        assert r.status_code == 422, f"expected 422 for <8 char pw, got {r.status_code}: {r.text}"

    def test_password_weak_no_uppercase_or_digit_400(self):
        # 8+ chars but missing uppercase+digit -> custom validator -> 400
        r = requests.post(f"{BASE_URL}/recovery/password/phone/verify",
                          json={"firebase_id_token": "x" * 25,
                                "new_password": "alllower"}, timeout=30)
        assert r.status_code == 400, f"expected 400 for weak pw, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        assert "uppercase" in detail.lower() and "number" in detail.lower(), \
            f"unexpected error detail: {detail}"

    def test_password_weak_no_digit_400(self):
        r = requests.post(f"{BASE_URL}/recovery/password/phone/verify",
                          json={"firebase_id_token": "x" * 25,
                                "new_password": "OnlyLetters"}, timeout=30)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "uppercase" in detail.lower() or "number" in detail.lower()

    def test_password_weak_no_uppercase_400(self):
        r = requests.post(f"{BASE_URL}/recovery/password/phone/verify",
                          json={"firebase_id_token": "x" * 25,
                                "new_password": "lower1234"}, timeout=30)
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "uppercase" in detail.lower() or "number" in detail.lower()

    def test_invalid_firebase_token_returns_401(self):
        # Strong password BUT invalid firebase token -> 401
        r = requests.post(f"{BASE_URL}/recovery/password/phone/verify",
                          json={"firebase_id_token": "ey" + "a" * 100 + ".invalid.token",
                                "new_password": "ValidPass123"}, timeout=30)
        assert r.status_code == 401, f"expected 401 for bad token, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        assert "invalid" in detail.lower() or "expired" in detail.lower() \
            or "phone" in detail.lower()


# ---------------- /api/recovery/email/reveal ----------------
class TestEmailReveal:
    def test_invalid_token_returns_401(self):
        r = requests.post(f"{BASE_URL}/recovery/email/reveal",
                          json={"firebase_id_token": "ey" + "a" * 100 + ".bad.token"},
                          timeout=30)
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text}"

    def test_token_too_short_422(self):
        r = requests.post(f"{BASE_URL}/recovery/email/reveal",
                          json={"firebase_id_token": "short"}, timeout=30)
        assert r.status_code == 422


# ---------------- Email masking unit-style test via real backend (indirect) ----------------
# We can't directly invoke _mask_email through HTTP, but we can verify the function
# from code by importing locally if backend modules are importable.
class TestEmailMaskingFunction:
    """Direct unit test of _mask_email helper via import."""
    def test_mask_email_format(self):
        try:
            import sys
            sys.path.insert(0, "/app/backend")
            from recovery import _mask_email
        except Exception as e:
            pytest.skip(f"cannot import recovery._mask_email: {e}")

        # Standard format
        assert _mask_email("john@gmail.com") == "j***n@gmail.com"
        # Short local-part (<=3 chars)
        assert _mask_email("ab@x.com") == "a***@x.com"
        assert _mask_email("abc@x.com") == "a***@x.com"
        # Single char local
        assert _mask_email("j@gmail.com") == "j***@gmail.com"
        # 4+ chars uses first + *** + last
        assert _mask_email("jane@gmail.com") == "j***e@gmail.com"
        # Domain preserved
        assert _mask_email("alice@company.co.uk") == "a***e@company.co.uk"
        # Garbage / no @
        assert _mask_email("notanemail") == "***"
        assert _mask_email("") == "***"


# ---------------- Backward-compat /api/auth/forgot-password & reset-password ----------------
class TestLegacyForgotReset:
    def test_legacy_forgot_password_endpoint_responds(self):
        r = requests.post(f"{BASE_URL}/auth/forgot-password",
                          json={"email": "fulltest@test.com"}, timeout=30)
        # Should return 200 or 404 (depending on implementation), but not 500
        assert r.status_code in (200, 400, 404), \
            f"legacy forgot-password broken: {r.status_code} {r.text}"

    def test_legacy_reset_password_endpoint_responds(self):
        # Send invalid token; expect rejection (4xx), not 500
        r = requests.post(f"{BASE_URL}/auth/reset-password",
                          json={"token": "invalid", "new_password": "NewPass123!"},
                          timeout=30)
        assert r.status_code in (400, 401, 404, 422), \
            f"legacy reset-password broken: {r.status_code} {r.text}"


# ---------------- Quick balance regression (smoke) ----------------
class TestBalanceRegressionSmoke:
    @pytest.fixture(scope="class")
    def client(self):
        r = requests.post(f"{BASE_URL}/auth/single-user", timeout=30)
        assert r.status_code == 200
        tok = r.json().get("access_token") or r.json().get("token")
        s = requests.Session()
        s.headers.update({"Authorization": f"Bearer {tok}",
                          "Content-Type": "application/json"})
        return s

    def test_income_then_expense_balance_flow(self, client):
        # Create account
        r = client.post(f"{BASE_URL}/accounts",
                        json={"name": "TEST_RecBal", "account_type": "bank",
                              "initial_balance": 10000,
                              "account_holder_name": "TEST",
                              "account_number": "REC1234567890",
                              "ifsc_code": "HDFC0001234"}, timeout=30)
        assert r.status_code == 200
        aid = r.json()["account_id"]

        try:
            # Income +5000 -> 15000
            r = client.post(f"{BASE_URL}/income", json={
                "account_id": aid, "amount": 5000, "category": "salary",
                "source": "TEST", "date": "2026-01-15T00:00:00Z"}, timeout=30)
            assert r.status_code == 200
            inc_id = r.json()["income_id"]

            r = client.get(f"{BASE_URL}/accounts/{aid}", timeout=30)
            bal = r.json().get("balance")
            assert bal == 15000, f"expected 15000 got {bal}"

            # Expense -2000 -> 13000
            r = client.post(f"{BASE_URL}/expenses", json={
                "account_id": aid, "amount": 2000, "category": "food",
                "description": "TEST", "payment_type": "bank",
                "date": "2026-01-15T00:00:00Z"}, timeout=30)
            assert r.status_code == 200
            exp_id = r.json()["expense_id"]

            r = client.get(f"{BASE_URL}/accounts/{aid}", timeout=30)
            bal = r.json().get("balance")
            assert bal == 13000, f"expected 13000 got {bal}"

            client.delete(f"{BASE_URL}/income/{inc_id}", timeout=30)
            client.delete(f"{BASE_URL}/expenses/{exp_id}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{aid}", timeout=30)
