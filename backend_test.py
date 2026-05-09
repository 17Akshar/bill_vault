"""
Backend tests for Budget Templates endpoints.
- GET /api/budget/templates
- POST /api/budget/apply-template
"""
import os
import sys
import requests

BASE = os.environ.get("BACKEND_URL") or "https://budget-refresh-3.preview.emergentagent.com"
API = f"{BASE}/api"

PASS = []
FAIL = []


def check(cond, name, info=""):
    if cond:
        PASS.append(name)
        print(f"PASS: {name}")
    else:
        FAIL.append((name, info))
        print(f"FAIL: {name} :: {info}")


def jget(url, **kw):
    return requests.get(url, timeout=30, **kw)


def jpost(url, payload):
    return requests.post(url, json=payload, timeout=30)


def main():
    print(f"Using API base: {API}")

    original_currency = None
    original_total_budget = None
    original_start_date = None
    try:
        r = jget(f"{API}/budget")
        if r.status_code == 200:
            b = r.json()
            original_currency = b.get("currency")
            original_total_budget = b.get("total_budget")
            original_start_date = b.get("start_date")
            print(f"Original budget: currency={original_currency}, total={original_total_budget}")
    except Exception as e:
        print(f"Could not read original budget: {e}")

    MONTH = 8
    YEAR = 2099

    # Pre-cleanup
    try:
        r = jget(f"{API}/category-budgets", params={"month": MONTH, "year": YEAR})
        if r.status_code == 200:
            for cb in r.json():
                requests.delete(f"{API}/category-budgets/{cb['id']}", timeout=15)
    except Exception as e:
        print(f"pre-cleanup: {e}")

    # ---- TEST 1: GET /api/budget/templates ----
    r = jget(f"{API}/budget/templates")
    check(r.status_code == 200, "GET /budget/templates -> 200", f"got {r.status_code}")
    if r.status_code == 200:
        templates = r.json()
        check(isinstance(templates, list) and len(templates) == 4,
              "Templates list has 4 entries",
              f"got {len(templates) if isinstance(templates, list) else type(templates)}")
        ids = [t.get("id") for t in templates]
        for needed in ["student", "family", "saver", "professional"]:
            check(needed in ids, f"Template id '{needed}' present", f"ids={ids}")
        required_keys = {"id", "name", "description", "icon", "color", "total_budget", "categories"}
        for t in templates:
            missing = required_keys - set(t.keys())
            check(not missing, f"Template '{t.get('id')}' has all required keys",
                  f"missing={missing}")
            check(isinstance(t.get("total_budget"), (int, float)),
                  f"Template '{t.get('id')}' total_budget is number",
                  f"got {type(t.get('total_budget'))}")
            check(isinstance(t.get("categories"), list) and len(t["categories"]) > 0,
                  f"Template '{t.get('id')}' categories is non-empty list")

    # ---- TEST 2a: Apply 'student' to clean month ----
    body = {"template_id": "student", "month": MONTH, "year": YEAR, "overwrite": False}
    r = jpost(f"{API}/budget/apply-template", body)
    check(r.status_code == 200, "Apply 'student' to clean month -> 200",
          f"got {r.status_code}: {r.text[:300]}")
    apply_currency = None
    if r.status_code == 200:
        data = r.json()
        apply_currency = data.get("currency")
        check(data.get("created_count") == 5, "student created_count=5", f"got {data.get('created_count')}")
        check(data.get("skipped_count") == 0, "student skipped_count=0", f"got {data.get('skipped_count')}")
        check(apply_currency is not None, "currency is in response", f"got {apply_currency}")

    # Verify GET /api/category-budgets shows 5 entries with correct names/amounts
    r = jget(f"{API}/category-budgets", params={"month": MONTH, "year": YEAR})
    check(r.status_code == 200, "GET category-budgets after student -> 200")
    student_expected = {
        "Food & Dining": 8000,
        "Transport": 4000,
        "Education": 10000,
        "Entertainment": 3000,
        "Others": 5000,
    }
    if r.status_code == 200:
        cbs = r.json()
        check(len(cbs) == 5, "5 category budgets created", f"got {len(cbs)}")
        names_amounts = {cb["category_name"]: cb["budget_amount"] for cb in cbs}
        for name, amt in student_expected.items():
            check(names_amounts.get(name) == amt,
                  f"Category '{name}' budget_amount={amt}",
                  f"got {names_amounts.get(name)}")

    # Verify GET /api/budget shows total_budget=30000 and currency preserved
    r = jget(f"{API}/budget")
    check(r.status_code == 200, "GET /budget after student -> 200")
    if r.status_code == 200:
        bj = r.json()
        check(bj.get("total_budget") == 30000,
              "Budget total_budget=30000 after student",
              f"got {bj.get('total_budget')}")
        if original_currency:
            check(bj.get("currency") == original_currency,
                  f"Currency preserved (={original_currency}) after student apply",
                  f"got {bj.get('currency')}")

    # ---- TEST 2b: Apply 'student' again (overwrite=false default) ----
    body = {"template_id": "student", "month": MONTH, "year": YEAR, "overwrite": False}
    r = jpost(f"{API}/budget/apply-template", body)
    check(r.status_code == 200, "Re-apply 'student' (no overwrite) -> 200")
    if r.status_code == 200:
        data = r.json()
        check(data.get("created_count") == 0, "Re-apply created_count=0", f"got {data.get('created_count')}")
        check(data.get("skipped_count") == 5, "Re-apply skipped_count=5", f"got {data.get('skipped_count')}")

    # ---- TEST 2c: Apply 'family' to same month, overwrite=false ----
    # NOTE: Review request states "expect created_count=7 (different categories, none conflict with student's). skipped_count=0"
    # However family categories are: Home, Food & Dining, Transport, Health, Education, Entertainment, Shopping
    # Student categories are: Food & Dining, Transport, Education, Entertainment, Others
    # Overlap = Food & Dining, Transport, Education, Entertainment (4)
    # New = Home, Health, Shopping (3)
    # So actual expected behavior: created=3, skipped=4. The review's expectation appears INCORRECT.
    body = {"template_id": "family", "month": MONTH, "year": YEAR, "overwrite": False}
    r = jpost(f"{API}/budget/apply-template", body)
    check(r.status_code == 200, "Apply 'family' on top of student -> 200")
    if r.status_code == 200:
        data = r.json()
        cc = data.get("created_count")
        sc = data.get("skipped_count")
        print(f"  Actual family-on-student: created={cc}, skipped={sc}")
        # Test the actual correct behavior (overlap-based skipping)
        check(cc == 3, "family created_count=3 (3 new categories not in student)", f"got {cc}")
        check(sc == 4, "family skipped_count=4 (4 overlap with student)", f"got {sc}")

    # Verify total budgets in this month is now 5 (student) + 3 (new from family) = 8
    r = jget(f"{API}/category-budgets", params={"month": MONTH, "year": YEAR})
    if r.status_code == 200:
        check(len(r.json()) == 8, "After student+family overlay, 8 category budgets exist",
              f"got {len(r.json())}")

    # ---- TEST 2d: Apply 'saver' with overwrite=true ----
    body = {"template_id": "saver", "month": MONTH, "year": YEAR, "overwrite": True}
    r = jpost(f"{API}/budget/apply-template", body)
    check(r.status_code == 200, "Apply 'saver' with overwrite=true -> 200")
    if r.status_code == 200:
        data = r.json()
        check(data.get("created_count") == 5, "saver created_count=5 after overwrite",
              f"got {data.get('created_count')}")
        check(data.get("skipped_count") == 0, "saver skipped_count=0 after overwrite",
              f"got {data.get('skipped_count')}")

    # Verify only 5 saver categories exist for that month
    r = jget(f"{API}/category-budgets", params={"month": MONTH, "year": YEAR})
    saver_expected = {"Home", "Food & Dining", "Transport", "Health", "Others"}
    if r.status_code == 200:
        cbs = r.json()
        check(len(cbs) == 5, "After overwrite, only 5 budgets exist", f"got {len(cbs)}")
        names = {cb["category_name"] for cb in cbs}
        check(names == saver_expected, "Saver categories are exactly the saver template's set",
              f"got {names}")

    # ---- TEST 2e: Invalid template_id -> 404 ----
    body = {"template_id": "xxx", "month": MONTH, "year": YEAR, "overwrite": False}
    r = jpost(f"{API}/budget/apply-template", body)
    check(r.status_code == 404, "Invalid template_id -> 404", f"got {r.status_code}")
    if r.status_code == 404:
        detail = r.json().get("detail", "")
        check("xxx" in detail and "not found" in detail.lower(),
              "404 detail format: 'Template \\'xxx\\' not found'",
              f"detail={detail}")

    # ---- TEST 2f: Invalid month=13 -> 400 ----
    body = {"template_id": "student", "month": 13, "year": YEAR, "overwrite": False}
    r = jpost(f"{API}/budget/apply-template", body)
    check(r.status_code == 400, "Invalid month=13 -> 400", f"got {r.status_code}: {r.text[:300]}")
    if r.status_code == 400:
        detail = r.json().get("detail", "")
        check(bool(detail), "400 has detail message", f"detail={detail}")

    # ---- TEST 2g: Currency preservation when set to EUR ----
    set_eur = {
        "total_budget": 50000,
        "period": "monthly",
        "start_date": "2099-08-01T00:00:00",
        "currency": "EUR",
    }
    r = jpost(f"{API}/budget", set_eur)
    check(r.status_code == 200, "Set currency=EUR via POST /budget -> 200", f"got {r.status_code}")

    body = {"template_id": "professional", "month": MONTH, "year": YEAR, "overwrite": True}
    r = jpost(f"{API}/budget/apply-template", body)
    check(r.status_code == 200, "Apply 'professional' with EUR set -> 200")
    if r.status_code == 200:
        data = r.json()
        check(data.get("currency") == "EUR", "Apply-template response currency=EUR preserved",
              f"got {data.get('currency')}")

    r = jget(f"{API}/budget")
    if r.status_code == 200:
        check(r.json().get("currency") == "EUR",
              "GET /budget currency=EUR after apply-template (preserved)",
              f"got {r.json().get('currency')}")

    # ---- CLEANUP ----
    print("\nCleanup: deleting test category_budgets and restoring currency...")
    try:
        r = jget(f"{API}/category-budgets", params={"month": MONTH, "year": YEAR})
        if r.status_code == 200:
            for cb in r.json():
                requests.delete(f"{API}/category-budgets/{cb['id']}", timeout=15)
        r2 = jget(f"{API}/category-budgets", params={"month": MONTH, "year": YEAR})
        if r2.status_code == 200:
            remaining = len(r2.json())
            print(f"  Remaining budgets after cleanup: {remaining}")
            check(remaining == 0, "Cleanup successful (0 budgets remaining for test month)",
                  f"got {remaining}")
    except Exception as e:
        print(f"  cleanup error: {e}")

    # Restore currency to INR (or whatever was originally set)
    restore_currency = original_currency or "INR"
    try:
        rb = jget(f"{API}/budget")
        if rb.status_code == 200:
            cur = rb.json()
            payload = {
                "total_budget": original_total_budget if original_total_budget else cur.get("total_budget", 75000),
                "period": cur.get("period", "monthly"),
                "start_date": original_start_date or cur.get("start_date") or "2026-01-01T00:00:00",
                "currency": restore_currency,
            }
            r = jpost(f"{API}/budget", payload)
            print(f"  Restored currency to {restore_currency}: status={r.status_code}")
    except Exception as e:
        print(f"  currency restore error: {e}")

    # ---- SUMMARY ----
    print("\n" + "=" * 60)
    print(f"PASSED: {len(PASS)}")
    print(f"FAILED: {len(FAIL)}")
    if FAIL:
        print("\nFailures:")
        for n, info in FAIL:
            print(f"  - {n} :: {info}")
    print("=" * 60)
    sys.exit(0 if not FAIL else 1)


if __name__ == "__main__":
    main()
