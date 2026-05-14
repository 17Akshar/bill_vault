"""
Tests for NEW endpoints in this iteration:
- POST /api/uploads/attachment (image upload with local-disk fallback)
- GET  /api/uploads/files/{path} (serve local file)
- GET  /api/labels (distinct labels previously used by user)
- POST /api/transfers with new optional fields (labels, payee, payment_type,
  location, attachment_url) + round-trip via GET /api/transfers
- Regression: backward-compat POST to /api/income, /api/expenses, /api/transfers
  WITHOUT the new optional fields.
"""
import io
import os
import time
import struct
import zlib
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://cash-flow-hub-81.preview.emergentagent.com",
).rstrip("/") + "/api"


# ---------- helpers ----------
def _make_png_bytes(width: int = 2, height: int = 2) -> bytes:
    """Build a minimal valid PNG (2x2 red) in-memory so we don't depend on Pillow."""
    def _chunk(tag: bytes, data: bytes) -> bytes:
        return (struct.pack(">I", len(data)) + tag + data
                + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff))
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = _chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
    raw = b""
    for _ in range(height):
        raw += b"\x00" + (b"\xff\x00\x00" * width)  # filter 0 + RGB red
    idat = _chunk(b"IDAT", zlib.compress(raw))
    iend = _chunk(b"IEND", b"")
    return sig + ihdr + idat + iend


@pytest.fixture(scope="module")
def client():
    r = requests.post(f"{BASE_URL}/auth/single-user", timeout=30)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


def _mk_account(client, name, balance):
    import time as _t
    ts = int(_t.time() * 1000000)
    r = client.post(f"{BASE_URL}/accounts",
                    headers={"Content-Type": "application/json"},
                    json={"name": name, "account_type": "bank",
                          "initial_balance": balance,
                          "account_holder_name": "TEST",
                          "account_number": f"UPL{ts}",
                          "ifsc_code": "HDFC0001234"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["account_id"]


# =============== UPLOADS ===============
class TestUploadAttachment:
    def test_upload_png_success(self, client):
        png = _make_png_bytes()
        r = client.post(
            f"{BASE_URL}/uploads/attachment",
            files={"file": ("test.png", png, "image/png")},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "attachment_url" in data
        assert "path" in data
        assert data.get("storage") in ("firebase", "local")
        assert data.get("size") == len(png)
        assert data.get("content_type") == "image/png"

        # If local, the served URL should GET the same bytes back
        if data["storage"] == "local":
            url = data["attachment_url"]
            # served URL is /api/uploads/files/<path>
            base = BASE_URL.rsplit("/api", 1)[0]
            full = base + url if url.startswith("/api") else url
            rr = client.get(full, timeout=30)
            assert rr.status_code == 200, rr.text
            assert rr.content == png, "served bytes must match uploaded bytes"
            assert rr.headers.get("content-type", "").startswith("image/")

    def test_upload_rejects_non_image(self, client):
        r = client.post(
            f"{BASE_URL}/uploads/attachment",
            files={"file": ("note.txt", b"hello world", "text/plain")},
            timeout=30,
        )
        assert r.status_code == 400, r.text
        assert "text/plain" in r.text or "Unsupported" in r.text

    def test_upload_rejects_empty(self, client):
        r = client.post(
            f"{BASE_URL}/uploads/attachment",
            files={"file": ("empty.png", b"", "image/png")},
            timeout=30,
        )
        assert r.status_code == 400, r.text
        assert "empty" in r.text.lower()

    def test_upload_rejects_too_large(self, client):
        # 10MB + 1 byte — just over the cap; keep payload minimal to avoid slow network
        blob = b"\x00" * (10 * 1024 * 1024 + 1)
        r = client.post(
            f"{BASE_URL}/uploads/attachment",
            files={"file": ("big.png", blob, "image/png")},
            timeout=120,
        )
        assert r.status_code == 413, f"expected 413, got {r.status_code}: {r.text[:200]}"


# =============== LABELS ===============
class TestLabels:
    def test_labels_reflect_recent_expense(self, client):
        ts = int(time.time() * 1000)
        aid = _mk_account(client, f"TEST_LblAcc_{ts}", 5000)
        try:
            uniq_a = f"regression-a-{ts}"
            uniq_b = f"regression-b-{ts}"
            payload = {
                "account_id": aid, "amount": 10, "category": "shopping",
                "description": "TEST_labels", "payment_type": "upi",
                "date": "2026-01-10T12:00:00Z",
                "labels": [uniq_a, uniq_b],
            }
            r = client.post(f"{BASE_URL}/expenses",
                            headers={"Content-Type": "application/json"},
                            json=payload, timeout=30)
            assert r.status_code == 200, r.text
            eid = r.json()["expense_id"]
            try:
                r = client.get(f"{BASE_URL}/labels", timeout=30)
                assert r.status_code == 200, r.text
                data = r.json()
                assert "labels" in data and isinstance(data["labels"], list)
                labels = data["labels"]
                assert uniq_a in labels, f"missing {uniq_a} in {labels}"
                assert uniq_b in labels, f"missing {uniq_b} in {labels}"
            finally:
                client.delete(f"{BASE_URL}/expenses/{eid}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{aid}", timeout=30)


# =============== TRANSFER new optional fields ===============
class TestTransferOptionalFields:
    def test_transfer_with_new_fields_round_trip(self, client):
        ts = int(time.time() * 1000)
        a1 = _mk_account(client, f"TEST_TxOptFrom_{ts}", 20000)
        a2 = _mk_account(client, f"TEST_TxOptTo_{ts}",    5000)
        try:
            payload = {
                "amount": 1500, "from_account_id": a1, "to_account_id": a2,
                "date": "2026-01-10T12:00:00Z",
                "labels": ["rent-split", "shared"],
                "payee": "Roommate",
                "payment_type": "upi",
                "location": "Home",
                "attachment_url": "https://example.com/rcpt.png",
                "notes": "TEST_txfr_opt",
            }
            r = client.post(f"{BASE_URL}/transfers",
                            headers={"Content-Type": "application/json"},
                            json=payload, timeout=30)
            assert r.status_code == 200, r.text
            t = r.json()
            tid = t["transfer_id"]
            # Balance side-effect still works
            r2 = client.get(f"{BASE_URL}/accounts", timeout=30)
            by_id = {a["account_id"]: a for a in r2.json()}
            assert by_id[a1].get("balance", by_id[a1].get("current_balance")) == 18500
            assert by_id[a2].get("balance", by_id[a2].get("current_balance")) == 6500
            # Round-trip via GET list
            r3 = client.get(f"{BASE_URL}/transfers", timeout=30)
            assert r3.status_code == 200
            rec = next((x for x in r3.json() if x.get("transfer_id") == tid), None)
            assert rec is not None, "created transfer missing from listing"
            assert rec.get("labels") == ["rent-split", "shared"]
            assert rec.get("payee") == "Roommate"
            assert rec.get("payment_type") == "upi"
            assert rec.get("location") == "Home"
            assert rec.get("attachment_url") == "https://example.com/rcpt.png"

            client.delete(f"{BASE_URL}/transfers/{tid}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{a1}", timeout=30)
            client.delete(f"{BASE_URL}/accounts/{a2}", timeout=30)


# =============== Backward-compat (no new optional fields) ===============
class TestBackwardCompat:
    def test_expense_without_new_fields(self, client):
        ts = int(time.time() * 1000)
        aid = _mk_account(client, f"TEST_BC_Exp_{ts}", 1000)
        try:
            r = client.post(f"{BASE_URL}/expenses",
                            headers={"Content-Type": "application/json"},
                            json={"account_id": aid, "amount": 10,
                                  "category": "other", "description": "bc",
                                  "payment_type": "cash",
                                  "date": "2026-01-10T12:00:00Z"},
                            timeout=30)
            assert r.status_code == 200, r.text
            client.delete(f"{BASE_URL}/expenses/{r.json()['expense_id']}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{aid}", timeout=30)

    def test_income_without_new_fields(self, client):
        ts = int(time.time() * 1000)
        aid = _mk_account(client, f"TEST_BC_Inc_{ts}", 0)
        try:
            r = client.post(f"{BASE_URL}/income",
                            headers={"Content-Type": "application/json"},
                            json={"account_id": aid, "amount": 500,
                                  "category": "salary", "source": "bc",
                                  "date": "2026-01-10T12:00:00Z"},
                            timeout=30)
            assert r.status_code == 200, r.text
            client.delete(f"{BASE_URL}/income/{r.json()['income_id']}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{aid}", timeout=30)

    def test_transfer_without_new_fields(self, client):
        ts = int(time.time() * 1000)
        a1 = _mk_account(client, f"TEST_BC_TF_{ts}", 10000)
        a2 = _mk_account(client, f"TEST_BC_TT_{ts}",  1000)
        try:
            r = client.post(f"{BASE_URL}/transfers",
                            headers={"Content-Type": "application/json"},
                            json={"amount": 500,
                                  "from_account_id": a1,
                                  "to_account_id": a2,
                                  "date": "2026-01-10T12:00:00Z"},
                            timeout=30)
            assert r.status_code == 200, r.text
            client.delete(f"{BASE_URL}/transfers/{r.json()['transfer_id']}", timeout=30)
        finally:
            client.delete(f"{BASE_URL}/accounts/{a1}", timeout=30)
            client.delete(f"{BASE_URL}/accounts/{a2}", timeout=30)
