"""
Backend Test Suite for Lend & Borrowed (Loans) endpoints.
Tests all 5 new loan tasks per the review request.
"""
import sys
import requests
from datetime import datetime

BASE_URL = "https://budget-refresh-3.preview.emergentagent.com/api"

PASS = []
FAIL = []
created_loan_ids = []


def log_pass(name):
    PASS.append(name)
    print(f"  PASS: {name}")


def log_fail(name, reason):
    FAIL.append((name, reason))
    print(f"  FAIL: {name} -> {reason}")


def assert_eq(name, got, expected):
    if got == expected:
        log_pass(name)
    else:
        log_fail(name, f"expected {expected!r}, got {got!r}")


def assert_true(name, cond, detail=""):
    if cond:
        log_pass(name)
    else:
        log_fail(name, detail or "condition false")


def post(path, payload):
    return requests.post(f"{BASE_URL}{path}", json=payload, timeout=30)


def get(path, params=None):
    return requests.get(f"{BASE_URL}{path}", params=params, timeout=30)


def put(path, payload):
    return requests.put(f"{BASE_URL}{path}", json=payload, timeout=30)


def delete(path):
    return requests.delete(f"{BASE_URL}{path}", timeout=30)


def test_post_loans():
    print("\n--- POST /api/loans ---")
    payload = {
        "person_name": "QA Tester Anjali Singh",
        "type": "lent",
        "purpose": "Personal Loan",
        "amount": 5000,
        "start_date": datetime(2026, 1, 15).isoformat(),
        "due_date": datetime(2026, 6, 15).isoformat(),
        "interest_rate": 5.0,
        "notes": "Test loan #1",
    }
    r = post("/loans", payload)
    assert_eq("POST /loans (happy lent) status", r.status_code, 200)
    if r.status_code == 200:
        data = r.json()
        loan_id = data.get("_id")
        if loan_id:
            created_loan_ids.append(loan_id)
        for k in ["_id", "person_name", "type", "amount", "status", "total_paid",
                  "remaining_amount", "payment_count", "start_date"]:
            assert_true(f"POST /loans returns key '{k}'", k in data, f"missing {k}")
        assert_eq("POST /loans status=active", data.get("status"), "active")
        assert_eq("POST /loans total_paid=0", data.get("total_paid"), 0.0)
        assert_eq("POST /loans remaining_amount=5000", data.get("remaining_amount"), 5000.0)
        assert_eq("POST /loans payment_count=0", data.get("payment_count"), 0)
        assert_eq("POST /loans person_name", data.get("person_name"), "QA Tester Anjali Singh")
        assert_eq("POST /loans interest_rate", data.get("interest_rate"), 5.0)

    r = post("/loans", dict(payload, amount=0, person_name="QA Bad Zero"))
    assert_eq("POST /loans amount=0 -> 400", r.status_code, 400)

    r = post("/loans", dict(payload, amount=-100, person_name="QA Bad Neg"))
    assert_eq("POST /loans amount=-100 -> 400", r.status_code, 400)

    r = post("/loans", dict(payload, type="other", person_name="QA Bad Type"))
    assert_eq("POST /loans type='other' -> 400", r.status_code, 400)

    r = post("/loans", {})
    assert_eq("POST /loans missing required -> 422", r.status_code, 422)


def test_list_loans():
    print("\n--- GET /api/loans (list + filters) ---")
    borrowed_payload = {
        "person_name": "QA Tester Vikram Kapoor",
        "type": "borrowed",
        "amount": 3000,
        "start_date": datetime(2026, 2, 1).isoformat(),
    }
    r = post("/loans", borrowed_payload)
    assert_eq("Setup: create borrowed loan", r.status_code, 200)
    if r.status_code == 200:
        created_loan_ids.append(r.json()["_id"])

    r = get("/loans")
    assert_eq("GET /loans status", r.status_code, 200)
    if r.status_code == 200:
        data = r.json()
        assert_true("GET /loans returns list", isinstance(data, list))
        if isinstance(data, list) and data:
            sample = data[0]
            for k in ["_id", "person_name", "type", "purpose", "amount",
                      "total_paid", "remaining_amount", "payment_count",
                      "status", "start_date"]:
                assert_true(f"GET /loans item has '{k}'", k in sample, f"missing {k}")

    r = get("/loans", {"type": "lent"})
    assert_eq("GET /loans?type=lent status", r.status_code, 200)
    if r.status_code == 200:
        data = r.json()
        assert_true("GET /loans?type=lent only lent",
                    all(item.get("type") == "lent" for item in data))

    r = get("/loans", {"type": "borrowed"})
    assert_eq("GET /loans?type=borrowed status", r.status_code, 200)
    if r.status_code == 200:
        data = r.json()
        assert_true("GET /loans?type=borrowed only borrowed",
                    all(item.get("type") == "borrowed" for item in data))

    r = get("/loans", {"type": "invalid"})
    assert_eq("GET /loans?type=invalid -> 400", r.status_code, 400)


def test_loans_summary():
    print("\n--- GET /api/loans/summary ---")
    r = get("/loans/summary")
    assert_eq("GET /loans/summary status", r.status_code, 200)
    if r.status_code != 200:
        return
    data = r.json()
    expected_keys = ["total_lent", "total_borrowed", "total_lent_remaining",
                     "total_borrowed_remaining", "lent_people_count",
                     "borrowed_people_count", "net_position", "loan_count"]
    for k in expected_keys:
        assert_true(f"summary has '{k}'", k in data, f"missing {k}")

    r2 = get("/loans", {"type": "lent"})
    if r2.status_code == 200:
        lent_loans = r2.json()
        sum_amount = sum(float(loan.get("amount", 0)) for loan in lent_loans)
        sum_remaining = sum(float(loan.get("remaining_amount", 0)) for loan in lent_loans)
        sum_paid = sum(float(loan.get("total_paid", 0)) for loan in lent_loans)
        assert_eq("summary.total_lent matches",
                  round(data["total_lent"], 2), round(sum_amount, 2))
        assert_eq("summary.total_lent_remaining matches",
                  round(data["total_lent_remaining"], 2), round(sum_remaining, 2))
        assert_eq("summary: total_lent - paid == total_lent_remaining",
                  round(data["total_lent"] - sum_paid, 2),
                  round(data["total_lent_remaining"], 2))

    expected_net = round(data["total_lent_remaining"] - data["total_borrowed_remaining"], 2)
    assert_eq("summary.net_position consistency",
              round(data["net_position"], 2), expected_net)


def test_get_loan_by_id():
    print("\n--- GET /api/loans/{id} ---")
    payload = {
        "person_name": "QA Tester Neha Bansal",
        "type": "lent",
        "amount": 2500,
        "start_date": datetime(2026, 3, 1).isoformat(),
    }
    r = post("/loans", payload)
    assert_eq("Setup: create loan for GET-by-id", r.status_code, 200)
    if r.status_code != 200:
        return
    loan_id = r.json()["_id"]
    created_loan_ids.append(loan_id)

    r = get(f"/loans/{loan_id}")
    assert_eq("GET /loans/{id} happy", r.status_code, 200)
    if r.status_code == 200:
        data = r.json()
        assert_true("GET /loans/{id} payments[]",
                    "payments" in data and isinstance(data["payments"], list))
        assert_eq("GET /loans/{id} _id matches", data.get("_id"), loan_id)
        assert_eq("GET /loans/{id} payment_count=0", data.get("payment_count"), 0)

    r = get("/loans/not-a-valid-id")
    assert_eq("GET /loans/{invalid} -> 400", r.status_code, 400)

    r = get("/loans/507f1f77bcf86cd799439099")
    assert_eq("GET /loans/{unknown valid id} -> 404", r.status_code, 404)


def test_put_loan():
    print("\n--- PUT /api/loans/{id} ---")
    payload = {
        "person_name": "QA Tester Rohit Iyer",
        "type": "borrowed",
        "amount": 1500,
        "start_date": datetime(2026, 1, 5).isoformat(),
    }
    r = post("/loans", payload)
    assert_eq("Setup: create loan for PUT", r.status_code, 200)
    if r.status_code != 200:
        return
    loan_id = r.json()["_id"]
    created_loan_ids.append(loan_id)

    upd = {
        "person_name": "QA Tester Rohit Iyer (Updated)",
        "amount": 1800,
        "notes": "Updated note from QA",
    }
    r = put(f"/loans/{loan_id}", upd)
    assert_eq("PUT /loans/{id} happy", r.status_code, 200)
    if r.status_code == 200:
        data = r.json()
        assert_eq("PUT updated person_name", data.get("person_name"),
                  "QA Tester Rohit Iyer (Updated)")
        assert_eq("PUT updated amount", float(data.get("amount", 0)), 1800.0)
        assert_eq("PUT updated notes", data.get("notes"), "Updated note from QA")

    r = put(f"/loans/{loan_id}", {})
    assert_eq("PUT /loans/{id} empty body -> 400", r.status_code, 400)

    r = put("/loans/bad-id", {"notes": "x"})
    assert_eq("PUT /loans/{invalid id} -> 400", r.status_code, 400)

    r = put("/loans/507f1f77bcf86cd799439099", {"notes": "x"})
    assert_eq("PUT /loans/{unknown valid id} -> 404", r.status_code, 404)


def test_delete_loan_cascade():
    print("\n--- DELETE /api/loans/{id} cascade ---")
    payload = {
        "person_name": "QA Tester Cascade Sahu",
        "type": "lent",
        "amount": 4000,
        "start_date": datetime(2026, 4, 1).isoformat(),
    }
    r = post("/loans", payload)
    assert_eq("Setup: create loan for DELETE cascade", r.status_code, 200)
    if r.status_code != 200:
        return
    loan_id = r.json()["_id"]

    p1 = post(f"/loans/{loan_id}/payments",
              {"amount": 1000, "date": datetime(2026, 4, 5).isoformat(), "method": "cash"})
    p2 = post(f"/loans/{loan_id}/payments",
              {"amount": 500, "date": datetime(2026, 4, 10).isoformat(), "method": "upi"})
    assert_eq("Setup: add payment 1", p1.status_code, 200)
    assert_eq("Setup: add payment 2", p2.status_code, 200)

    s_before = get("/loans/summary").json()
    total_lent_remaining_before = s_before["total_lent_remaining"]

    r = delete(f"/loans/{loan_id}")
    assert_eq("DELETE /loans/{id} happy", r.status_code, 200)

    r = get(f"/loans/{loan_id}")
    assert_eq("GET /loans/{deleted} -> 404", r.status_code, 404)

    s_after = get("/loans/summary").json()
    diff = round(total_lent_remaining_before - s_after["total_lent_remaining"], 2)
    assert_eq("DELETE cascade reduced total_lent_remaining by 2500",
              diff, 2500.0)

    r = delete("/loans/bad-id")
    assert_eq("DELETE /loans/{invalid} -> 400", r.status_code, 400)

    r = delete("/loans/507f1f77bcf86cd799439099")
    assert_eq("DELETE /loans/{unknown} -> 404", r.status_code, 404)


def test_payments_auto_status():
    print("\n--- Payments POST/DELETE with auto-status ---")
    r = post("/loans", {
        "person_name": "QA Tester Status Flow Mehta",
        "type": "lent",
        "amount": 10000,
        "start_date": datetime(2026, 5, 1).isoformat(),
    })
    assert_eq("Setup: create loan amount=10000", r.status_code, 200)
    if r.status_code != 200:
        return
    loan_id = r.json()["_id"]
    created_loan_ids.append(loan_id)

    r = post(f"/loans/{loan_id}/payments",
             {"amount": 3000, "date": datetime(2026, 5, 5).isoformat(), "method": "bank"})
    assert_eq("POST payment 3000 status", r.status_code, 200)
    p1_id = r.json().get("_id") if r.status_code == 200 else None

    r = get(f"/loans/{loan_id}")
    if r.status_code == 200:
        d = r.json()
        assert_eq("After 3000: status=partial", d.get("status"), "partial")
        assert_eq("After 3000: remaining=7000", d.get("remaining_amount"), 7000.0)
        assert_eq("After 3000: total_paid=3000", d.get("total_paid"), 3000.0)

    r = post(f"/loans/{loan_id}/payments",
             {"amount": 7000, "date": datetime(2026, 5, 10).isoformat(), "method": "bank"})
    assert_eq("POST payment 7000 status", r.status_code, 200)
    p2_id = r.json().get("_id") if r.status_code == 200 else None

    r = get(f"/loans/{loan_id}")
    if r.status_code == 200:
        d = r.json()
        assert_eq("After 7000: status=settled", d.get("status"), "settled")
        assert_eq("After 7000: remaining=0", d.get("remaining_amount"), 0.0)
        assert_eq("After 7000: payments has 2 entries", len(d.get("payments", [])), 2)

    r = post(f"/loans/{loan_id}/payments",
             {"amount": -50, "date": datetime(2026, 5, 11).isoformat()})
    assert_eq("POST payment amount=-50 -> 400", r.status_code, 400)

    r = post(f"/loans/{loan_id}/payments",
             {"amount": 0, "date": datetime(2026, 5, 11).isoformat()})
    assert_eq("POST payment amount=0 -> 400", r.status_code, 400)

    r = post("/loans/bad-id/payments",
             {"amount": 100, "date": datetime(2026, 5, 11).isoformat()})
    assert_eq("POST payment invalid loan id -> 400", r.status_code, 400)

    r = post("/loans/507f1f77bcf86cd799439099/payments",
             {"amount": 100, "date": datetime(2026, 5, 11).isoformat()})
    assert_eq("POST payment unknown loan id -> 404", r.status_code, 404)

    if not p2_id or not p1_id:
        log_fail("Setup payment ids missing", "cannot proceed with delete flow")
        return

    r = delete(f"/loans/{loan_id}/payments/{p2_id}")
    assert_eq("DELETE one payment status", r.status_code, 200)
    r = get(f"/loans/{loan_id}")
    if r.status_code == 200:
        d = r.json()
        assert_eq("After deleting 7000 payment: status=partial",
                  d.get("status"), "partial")
        assert_eq("After deleting 7000 payment: remaining=7000",
                  d.get("remaining_amount"), 7000.0)

    r = delete(f"/loans/{loan_id}/payments/{p1_id}")
    assert_eq("DELETE second payment status", r.status_code, 200)
    r = get(f"/loans/{loan_id}")
    if r.status_code == 200:
        d = r.json()
        assert_eq("After deleting both payments: status=active",
                  d.get("status"), "active")
        assert_eq("After deleting both payments: remaining=10000",
                  d.get("remaining_amount"), 10000.0)

    r = delete(f"/loans/bad/payments/{p1_id or 'x'}")
    assert_eq("DELETE payment invalid loan id -> 400", r.status_code, 400)

    r = delete(f"/loans/{loan_id}/payments/bad")
    assert_eq("DELETE payment invalid payment id -> 400", r.status_code, 400)

    r = delete(f"/loans/{loan_id}/payments/507f1f77bcf86cd799439099")
    assert_eq("DELETE unknown payment id -> 404", r.status_code, 404)


def cleanup():
    print("\n--- Cleanup ---")
    for lid in created_loan_ids:
        try:
            r = delete(f"/loans/{lid}")
            print(f"  cleanup delete {lid} -> {r.status_code}")
        except Exception as e:
            print(f"  cleanup error {lid} -> {e}")


def main():
    print(f"Testing against: {BASE_URL}")
    try:
        test_post_loans()
        test_list_loans()
        test_loans_summary()
        test_get_loan_by_id()
        test_put_loan()
        test_delete_loan_cascade()
        test_payments_auto_status()
    finally:
        cleanup()

    total = len(PASS) + len(FAIL)
    print(f"\n=========================")
    print(f"PASSED: {len(PASS)} / {total}")
    print(f"FAILED: {len(FAIL)} / {total}")
    if FAIL:
        print("\nFailures:")
        for name, reason in FAIL:
            print(f" - {name}: {reason}")
    return 0 if not FAIL else 1


if __name__ == "__main__":
    sys.exit(main())
