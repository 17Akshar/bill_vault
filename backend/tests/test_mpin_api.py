"""
MPIN Backend Tests (pytest)
Covers:
- /api/mpin/setup: 4-6 digit length, weak-MPIN rejection (with exact messages),
  format validation, success returns {message, is_enabled, pin_length}
- /api/mpin/verify: happy path, wrong MPIN with remaining attempts,
  brute-force lockout (5 wrong + 6th -> 429)
- /api/mpin/status: returns {is_enabled, pin_length, prompt_dismissed}
- /api/mpin/dismiss-prompt: persists mpin_prompt_dismissed=true
- /api/mpin/disable: flips is_enabled to false
- bcrypt hash storage check (direct DB read, hash starts with $2b$)
"""
import os
import pytest
import requests
from pymongo import MongoClient

BASE_URL = "https://fincare-db-redesign.preview.emergentagent.com/api"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/auth/single-user", timeout=30)
    assert r.status_code == 200, f"single-user auth failed: {r.status_code} {r.text[:200]}"
    data = r.json()
    tok = data.get("access_token") or data.get("token")
    assert tok, f"no token: {data}"
    return tok


@pytest.fixture(scope="module")
def user_id(token):
    """Decode JWT to get user_id, or fetch from /auth/me."""
    r = requests.get(f"{BASE_URL}/auth/me",
                     headers={"Authorization": f"Bearer {token}"}, timeout=30)
    if r.status_code == 200:
        d = r.json()
        return d.get("user_id") or d.get("id") or d.get("_id")
    # fallback: decode JWT payload
    import base64, json
    payload = token.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload)).get("user_id")


@pytest.fixture(scope="module")
def client(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def mongo_db():
    c = MongoClient(MONGO_URL)
    yield c[DB_NAME]
    c.close()


@pytest.fixture(scope="module")
def firestore_db():
    """Real Firestore client (backend uses Firestore via firebase_config.db)."""
    import sys
    sys.path.insert(0, "/app/backend")
    from firebase_config import db as fs_db
    return fs_db


def _reset_rate_limit(mongo_db, user_id):
    """Manually clear MPIN rate-limit doc to ensure clean test state."""
    if user_id:
        mongo_db.recovery_attempts.delete_one({"attempt_id": f"mpin_{user_id}"})


def _ensure_clean_mpin(client, mongo_db, user_id, mpin="7391"):
    """Reset rate limit, then set up a known MPIN. Setup also resets rate-limit on backend."""
    _reset_rate_limit(mongo_db, user_id)
    r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": mpin})
    assert r.status_code == 200, f"setup helper failed: {r.status_code} {r.text}"


# ---------------- MPIN SETUP: weak rejection ----------------
class TestMpinSetupWeakRejection:
    @pytest.mark.parametrize("mpin,expected_phrase", [
        ("1111", "all the same digit"),
        ("0000", "all the same digit"),
        ("2222", "all the same digit"),
        ("1234", "simple sequence"),
        ("4321", "simple descending sequence"),
        ("9876", "simple descending sequence"),
        ("1212", "repeating pattern"),
        ("4545", "repeating pattern"),
        ("123456", "simple sequence"),
        ("654321", "simple descending sequence"),
    ])
    def test_weak_mpin_rejected(self, client, mpin, expected_phrase):
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": mpin})
        assert r.status_code == 400, f"{mpin} should be 400, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "").lower()
        assert expected_phrase.lower() in detail, \
            f"For {mpin} expected phrase '{expected_phrase}' in message, got: {detail}"

    def test_common_mpin_rejected(self, client):
        # 6969 is in COMMON_WEAK list; not caught by sequence/repeat checks
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": "6969"})
        assert r.status_code == 400
        # 6969 -> repeating pair check catches it first ('69'*2 == '6969')
        # so message is 'repeating pattern'. Either is acceptable.
        d = r.json().get("detail", "").lower()
        assert "repeating" in d or "common" in d or "harder-to-guess" in d, d


# ---------------- MPIN SETUP: format validation ----------------
class TestMpinSetupFormat:
    @pytest.mark.parametrize("mpin", ["abc", "12a4", "12.4"])
    def test_non_digit_rejected(self, client, mpin):
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": mpin})
        assert r.status_code == 400
        assert "4-6 digits" in r.json().get("detail", "").lower() or \
               "digit" in r.json().get("detail", "").lower()

    def test_too_short_rejected(self, client):
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": "123"})
        assert r.status_code == 400
        assert "4-6 digits" in r.json().get("detail", "")

    def test_too_long_rejected(self, client):
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": "1234567"})
        assert r.status_code == 400
        assert "4-6 digits" in r.json().get("detail", "")

    def test_empty_rejected(self, client):
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": ""})
        assert r.status_code == 400


# ---------------- MPIN SETUP: success ----------------
class TestMpinSetupSuccess:
    def test_strong_4_digit_accepted(self, client, mongo_db, user_id):
        _reset_rate_limit(mongo_db, user_id)
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": "7391"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["is_enabled"] is True
        assert data["pin_length"] == 4
        assert "message" in data

    def test_strong_6_digit_accepted(self, client, mongo_db, user_id):
        _reset_rate_limit(mongo_db, user_id)
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": "739142"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["is_enabled"] is True
        assert data["pin_length"] == 6

    def test_bcrypt_hash_in_db(self, client, firestore_db, user_id):
        """Direct DB check: stored MPIN must be bcrypt hash (starts with $2b$/$2a$/$2y$),
        and never plain text. Backend uses Firestore via Mongo-style wrapper."""
        import asyncio
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": "7391"})
        assert r.status_code == 200
        rec = asyncio.get_event_loop().run_until_complete(
            firestore_db.user_mpin.find_one({"user_id": user_id})
        )
        assert rec is not None, f"No user_mpin doc found for user_id={user_id}"
        h = rec.get("mpin_hash", "")
        assert h.startswith("$2b$") or h.startswith("$2a$") or h.startswith("$2y$"), \
            f"hash does not look like bcrypt: {h[:20]}"
        assert "7391" not in h, "plain MPIN appears in stored hash!"
        assert rec.get("is_enabled") is True
        assert rec.get("pin_length") == 4


# ---------------- MPIN VERIFY: happy path & wrong ----------------
class TestMpinVerify:
    def test_correct_mpin_returns_verified(self, client, mongo_db, user_id):
        _ensure_clean_mpin(client, mongo_db, user_id, mpin="7391")
        r = client.post(f"{BASE_URL}/mpin/verify", json={"mpin": "7391"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("verified") is True

    def test_wrong_mpin_returns_401_with_remaining(self, client, mongo_db, user_id):
        _ensure_clean_mpin(client, mongo_db, user_id, mpin="7391")
        r = client.post(f"{BASE_URL}/mpin/verify", json={"mpin": "9999"})
        assert r.status_code == 401, r.text
        d = r.json().get("detail", "").lower()
        assert "invalid" in d
        assert "remaining" in d


# ---------------- MPIN VERIFY: brute-force lockout ----------------
class TestMpinBruteForceLockout:
    def test_5_wrong_attempts_then_429(self, client, mongo_db, user_id):
        _ensure_clean_mpin(client, mongo_db, user_id, mpin="7391")

        # 5 wrong attempts should return 401
        for i in range(5):
            r = client.post(f"{BASE_URL}/mpin/verify", json={"mpin": "9999"})
            assert r.status_code == 401, \
                f"Attempt {i+1} expected 401, got {r.status_code}: {r.text}"

        # 6th attempt -> 429 lockout
        r = client.post(f"{BASE_URL}/mpin/verify", json={"mpin": "9999"})
        assert r.status_code == 429, \
            f"6th wrong attempt expected 429, got {r.status_code}: {r.text}"
        d = r.json().get("detail", "").lower()
        assert "too many" in d
        assert "locked out until" in d

        # Even CORRECT MPIN now fails during lockout window
        r = client.post(f"{BASE_URL}/mpin/verify", json={"mpin": "7391"})
        assert r.status_code == 429, \
            f"During lockout, correct MPIN should also 429, got {r.status_code}: {r.text}"

        # Cleanup: reset rate limit
        _reset_rate_limit(mongo_db, user_id)

    def test_setup_resets_rate_limit(self, client, mongo_db, user_id):
        """A successful setup should clear the rate-limit counter."""
        _ensure_clean_mpin(client, mongo_db, user_id, mpin="7391")
        # Trigger 2 wrong attempts
        for _ in range(2):
            client.post(f"{BASE_URL}/mpin/verify", json={"mpin": "9999"})
        # Re-setup (should reset)
        r = client.post(f"{BASE_URL}/mpin/setup", json={"mpin": "7391"})
        assert r.status_code == 200
        # Now correct MPIN should verify (counter reset)
        r = client.post(f"{BASE_URL}/mpin/verify", json={"mpin": "7391"})
        assert r.status_code == 200
        assert r.json().get("verified") is True


# ---------------- MPIN STATUS ----------------
class TestMpinStatus:
    def test_status_after_setup(self, client, mongo_db, user_id):
        _ensure_clean_mpin(client, mongo_db, user_id, mpin="7391")
        r = client.get(f"{BASE_URL}/mpin/status")
        assert r.status_code == 200
        d = r.json()
        assert "is_enabled" in d
        assert "pin_length" in d
        assert "prompt_dismissed" in d
        assert d["is_enabled"] is True
        assert d["pin_length"] == 4

    def test_status_after_6_digit_setup(self, client, mongo_db, user_id):
        _reset_rate_limit(mongo_db, user_id)
        client.post(f"{BASE_URL}/mpin/setup", json={"mpin": "739142"})
        r = client.get(f"{BASE_URL}/mpin/status")
        assert r.status_code == 200
        assert r.json()["pin_length"] == 6


# ---------------- DISMISS PROMPT ----------------
class TestDismissPrompt:
    def test_dismiss_prompt_persists(self, client, mongo_db, user_id):
        # Reset settings
        mongo_db.user_settings.update_one(
            {"user_id": user_id},
            {"$set": {"mpin_prompt_dismissed": False}},
            upsert=True,
        )
        r = client.post(f"{BASE_URL}/mpin/dismiss-prompt", json={})
        assert r.status_code == 200
        assert "message" in r.json()
        # Verify persisted
        r = client.get(f"{BASE_URL}/mpin/status")
        assert r.status_code == 200
        assert r.json().get("prompt_dismissed") is True
        # Cleanup
        mongo_db.user_settings.update_one(
            {"user_id": user_id},
            {"$set": {"mpin_prompt_dismissed": False}},
        )


# ---------------- DISABLE ----------------
class TestMpinDisable:
    def test_disable_flips_flag(self, client, mongo_db, user_id):
        _ensure_clean_mpin(client, mongo_db, user_id, mpin="7391")
        r = client.post(f"{BASE_URL}/mpin/disable", json={})
        assert r.status_code == 200
        assert r.json().get("is_enabled") is False
        # Verify via status
        r = client.get(f"{BASE_URL}/mpin/status")
        assert r.status_code == 200
        assert r.json().get("is_enabled") is False
        # Restore for other tests
        _ensure_clean_mpin(client, mongo_db, user_id, mpin="7391")


# ---------------- AUTH ----------------
class TestMpinAuth:
    def test_setup_requires_auth(self):
        r = requests.post(f"{BASE_URL}/mpin/setup", json={"mpin": "7391"}, timeout=30)
        assert r.status_code in (401, 403)

    def test_verify_requires_auth(self):
        r = requests.post(f"{BASE_URL}/mpin/verify", json={"mpin": "7391"}, timeout=30)
        assert r.status_code in (401, 403)
