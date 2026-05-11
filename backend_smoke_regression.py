"""
Full backend smoke regression test for Fincare/BillVault.
Verifies no regressions after frontend navigation restructure.
Covers all 22 endpoints with 1-3 quick assertions each, then cleans up.
"""
import sys
import requests
from datetime import datetime

BASE_URL = "https://budget-refresh-3.preview.emergentagent.com/api"

PASS = []
FAIL = []
CLEANUP_NOTES = []

TEST_MONTH = 7
TEST_YEAR = 2099  # isolated future month to avoid touching live data


def p(name):
    PASS.append(name)
    print(f"  PASS: {name}")


def f(name, reason):
    FAIL.append((name, reason))
    print(f"  FAIL: {name} -> {reason}")


def eq(name, got, expected):
    if got == expected:
        p(name)
    else:
        f(name, f"expected {expected!r}, got {got!r}")


def truth(name, cond, detail=""):
    if cond:
        p(name)
    else:
        f(name, detail or "condition false")


def get(path, params=None):
    return requests.get(f"{BASE_URL}{path}", params=params, timeout=30)


def post(path, payload=None, params=None):
    return requests.post(f"{BASE_URL}{path}", json=payload, params=params, timeout=30)


def put(path, payload=None):
    return requests.put(f"{BASE_URL}{path}", json=payload, timeout=30)


def delete(path):
    return requests.delete(f"{BASE_URL}{path}", timeout=30)


# ============================================================
# 1) Root health
# ============================================================
def t_root():
    print("\n--- 1) GET /api/ root health ---")
    r = get("/")
    eq("root status", r.status_code, 200)
    if r.status_code == 200:
        data = r.json()
        truth("root has message", "message" in data)


# ============================================================
# 2) Categories list + seed (idempotent)
# ============================================================
def t_categories():
    print("\n--- 2) GET /api/categories + POST /api/categories/seed ---")
    r = get("/categories")
    eq("GET /categories status", r.status_code, 200)
    initial = r.json() if r.status_code == 200 else []
    truth("categories list non-empty", isinstance(initial, list) and len(initial) > 0)

    r2 = post("/categories/seed", payload={})
    eq("POST /categories/seed status", r2.status_code, 200)

    r3 = get("/categories")
    eq("GET /categories after seed status", r3.status_code, 200)
    if r3.status_code == 200:
        eq("seed idempotent (same count)", len(r3.json()), len(initial))


# ============================================================
# 3+4) Budget GET + POST (upsert)
# ============================================================
ORIGINAL_BUDGET = {}


def t_budget():
    print("\n--- 3+4) GET/POST /api/budget ---")
    r = get("/budget")
    eq("GET /budget status", r.status_code, 200)
    if r.status_code == 200:
        global ORIGINAL_BUDGET
        ORIGINAL_BUDGET = r.json()
        for k in ["total_budget", "period", "start_date", "currency"]:
            truth(f"GET /budget has '{k}'", k in ORIGINAL_BUDGET)

    # upsert flow - keep same values to avoid disturbing baseline
    payload = {
        "total_budget": ORIGINAL_BUDGET.get("total_budget", 75000),
        "period": ORIGINAL_BUDGET.get("period", "monthly"),
        "start_date": ORIGINAL_BUDGET.get("start_date", datetime(2026, 1, 1).isoformat()),
        "currency": ORIGINAL_BUDGET.get("currency", "INR"),
    }
    r2 = post("/budget", payload)
    eq("POST /budget upsert status", r2.status_code, 200)
    if r2.status_code == 200:
        eq("POST /budget echoes total_budget", r2.json().get("total_budget"), payload["total_budget"])
        eq("POST /budget echoes currency", r2.json().get("currency"), payload["currency"])


# ============================================================
# 5) Category Budgets full CRUD round-trip
# ============================================================
CB_ID = None


def t_category_budgets():
    print("\n--- 5) GET/POST/PUT/DELETE /api/category-budgets ---")
    global CB_ID

    # GET (might have items)
    r = get("/category-budgets", params={"month": TEST_MONTH, "year": TEST_YEAR})
    eq("GET /category-budgets status", r.status_code, 200)

    # POST
    payload = {
        "category_name": "QA-Smoke-Cat-Food",
        "category_icon": "restaurant",
        "budget_amount": 5000,
        "period": "monthly",
        "alert_limit": 80,
        "month": TEST_MONTH,
        "year": TEST_YEAR,
        "notes": "smoke test",
    }
    r2 = post("/category-budgets", payload)
    eq("POST /category-budgets status", r2.status_code, 200)
    if r2.status_code == 200:
        CB_ID = r2.json().get("_id")
        truth("POST /category-budgets has _id", CB_ID is not None)
        eq("POST /category-budgets amount", r2.json().get("budget_amount"), 5000.0)

    # PUT
    if CB_ID:
        r3 = put(f"/category-budgets/{CB_ID}", {"budget_amount": 6500, "alert_limit": 90})
        eq("PUT /category-budgets status", r3.status_code, 200)
        if r3.status_code == 200:
            eq("PUT updated amount", r3.json().get("budget_amount"), 6500.0)

    # DELETE
    if CB_ID:
        r4 = delete(f"/category-budgets/{CB_ID}")
        eq("DELETE /category-budgets status", r4.status_code, 200)
        CB_ID = None


# ============================================================
# 6) Savings Goals full CRUD with target_date
# ============================================================
SG_ID = None


def t_savings_goals():
    print("\n--- 6) GET/POST/PUT/DELETE /api/savings-goals ---")
    global SG_ID
    r = get("/savings-goals")
    eq("GET /savings-goals status", r.status_code, 200)

    payload = {
        "name": "QA Smoke Emergency Fund",
        "goal_amount": 50000,
        "target_date": "2027-12-31",
        "notes": "smoke test",
    }
    r2 = post("/savings-goals", payload)
    eq("POST /savings-goals status", r2.status_code, 200)
    if r2.status_code == 200:
        SG_ID = r2.json().get("_id")
        truth("POST /savings-goals has _id", SG_ID is not None)

    # PUT with target_date (regression check for BSON date encoding)
    if SG_ID:
        r3 = put(f"/savings-goals/{SG_ID}", {"goal_amount": 60000, "target_date": "2028-06-30"})
        eq("PUT /savings-goals (with target_date) status", r3.status_code, 200)
        if r3.status_code == 200:
            eq("PUT updated goal_amount", r3.json().get("goal_amount"), 60000.0)

    if SG_ID:
        r4 = delete(f"/savings-goals/{SG_ID}")
        eq("DELETE /savings-goals status", r4.status_code, 200)
        SG_ID = None


# ============================================================
# 7) Transactions full CRUD
# ============================================================
TX_INCOME = None
TX_EXPENSE = None


def t_transactions():
    print("\n--- 7) GET/POST/GET-id/DELETE /api/transactions ---")
    global TX_INCOME, TX_EXPENSE
    r = get("/transactions")
    eq("GET /transactions status", r.status_code, 200)

    # income
    p_inc = {
        "type": "income",
        "amount": 50000,
        "category": "Salary",
        "date": datetime(TEST_YEAR, TEST_MONTH, 1).isoformat(),
        "description": "QA smoke salary",
    }
    r1 = post("/transactions", p_inc)
    eq("POST income status", r1.status_code, 200)
    if r1.status_code == 200:
        TX_INCOME = r1.json().get("_id")

    # expense
    p_exp = {
        "type": "expense",
        "amount": 1200,
        "category": "Food & Dining",
        "date": datetime(TEST_YEAR, TEST_MONTH, 5).isoformat(),
        "description": "QA smoke grocery",
    }
    r2 = post("/transactions", p_exp)
    eq("POST expense status", r2.status_code, 200)
    if r2.status_code == 200:
        TX_EXPENSE = r2.json().get("_id")

    # GET by id
    if TX_INCOME:
        r3 = get(f"/transactions/{TX_INCOME}")
        eq("GET /transactions/{id} status", r3.status_code, 200)
        if r3.status_code == 200:
            eq("GET tx echoes amount", r3.json().get("amount"), 50000.0)


# ============================================================
# 8) Budget summary
# ============================================================
def t_budget_summary():
    print("\n--- 8) GET /api/budget-summary ---")
    r = get("/budget-summary", params={"month": TEST_MONTH, "year": TEST_YEAR})
    eq("GET /budget-summary status", r.status_code, 200)
    if r.status_code == 200:
        data = r.json()
        for k in ["total_budget", "total_spent", "remaining_budget", "income",
                  "expenses", "savings", "savings_rate", "categories", "month",
                  "year", "currency"]:
            truth(f"summary has '{k}'", k in data)
        # We seeded income=50000, expense=1200 for this test month
        eq("summary income matches seeded", data.get("income"), 50000.0)
        eq("summary expenses matches seeded", data.get("expenses"), 1200.0)


# ============================================================
# 9) Import budget (404 / 400 cases)
# ============================================================
def t_import_budget():
    print("\n--- 9) POST /api/import-budget ---")
    # 404 when source is empty
    r = post("/import-budget", params={
        "from_month": 1, "from_year": 2099,
        "to_month": 2, "to_year": 2099,
    })
    eq("import-budget 404 source-empty", r.status_code, 404)

    # 400 when target has data: seed source then attempt import to existing target
    # Use TEST_MONTH/TEST_YEAR which currently has no category budgets (we deleted ours).
    # Create source data
    p_source = {
        "category_name": "QA-Smoke-Import-Src",
        "category_icon": "restaurant",
        "budget_amount": 1000,
        "period": "monthly",
        "alert_limit": 80,
        "month": 3, "year": 2099,
    }
    rs = post("/category-budgets", p_source)
    eq("seed source for import status", rs.status_code, 200)
    src_id = rs.json().get("_id") if rs.status_code == 200 else None

    # create target so we get 400
    p_target = {
        "category_name": "QA-Smoke-Import-Tgt",
        "category_icon": "car",
        "budget_amount": 2000,
        "period": "monthly",
        "alert_limit": 80,
        "month": 4, "year": 2099,
    }
    rt = post("/category-budgets", p_target)
    eq("seed target for import status", rt.status_code, 200)
    tgt_id = rt.json().get("_id") if rt.status_code == 200 else None

    r400 = post("/import-budget", params={
        "from_month": 3, "from_year": 2099,
        "to_month": 4, "to_year": 2099,
    })
    eq("import-budget 400 target-has-data", r400.status_code, 400)

    # Cleanup these
    if src_id:
        delete(f"/category-budgets/{src_id}")
    if tgt_id:
        delete(f"/category-budgets/{tgt_id}")


# ============================================================
# 10) Budget Templates list
# ============================================================
def t_templates_list():
    print("\n--- 10) GET /api/budget/templates ---")
    r = get("/budget/templates")
    eq("GET /budget/templates status", r.status_code, 200)
    if r.status_code == 200:
        templates = r.json()
        eq("templates count == 4", len(templates), 4)
        ids = {t["id"] for t in templates}
        eq("template ids", ids, {"student", "family", "saver", "professional"})


# ============================================================
# 11) Apply Template (student) -> verify -> cleanup
# ============================================================
def t_apply_template():
    print("\n--- 11) POST /api/budget/apply-template ---")
    APPLY_MONTH = 8
    APPLY_YEAR = 2099

    # Ensure clean baseline for the apply month
    r0 = get("/category-budgets", params={"month": APPLY_MONTH, "year": APPLY_YEAR})
    if r0.status_code == 200:
        for b in r0.json():
            delete(f"/category-budgets/{b['_id']}")

    # Apply student
    r = post("/budget/apply-template", {
        "template_id": "student",
        "month": APPLY_MONTH,
        "year": APPLY_YEAR,
        "overwrite": False,
    })
    eq("apply-template status", r.status_code, 200)
    if r.status_code == 200:
        data = r.json()
        eq("student created_count", data.get("created_count"), 5)
        eq("student skipped_count", data.get("skipped_count"), 0)

    # Verify
    rv = get("/category-budgets", params={"month": APPLY_MONTH, "year": APPLY_YEAR})
    eq("verify apply count", len(rv.json()) if rv.status_code == 200 else -1, 5)

    # Restore total_budget to original
    if ORIGINAL_BUDGET:
        post("/budget", {
            "total_budget": ORIGINAL_BUDGET.get("total_budget", 75000),
            "period": ORIGINAL_BUDGET.get("period", "monthly"),
            "start_date": ORIGINAL_BUDGET.get("start_date", datetime(2026, 1, 1).isoformat()),
            "currency": ORIGINAL_BUDGET.get("currency", "INR"),
        })

    # Cleanup applied
    rv2 = get("/category-budgets", params={"month": APPLY_MONTH, "year": APPLY_YEAR})
    if rv2.status_code == 200:
        for b in rv2.json():
            delete(f"/category-budgets/{b['_id']}")
    rv3 = get("/category-budgets", params={"month": APPLY_MONTH, "year": APPLY_YEAR})
    eq("cleanup applied template", len(rv3.json()) if rv3.status_code == 200 else -1, 0)


# ============================================================
# 12) Loans list + summary
# ============================================================
def t_loans_list_summary():
    print("\n--- 12) GET /api/loans + GET /api/loans/summary ---")
    r = get("/loans")
    eq("GET /loans status", r.status_code, 200)
    truth("loans is list", isinstance(r.json(), list))

    rs = get("/loans/summary")
    eq("GET /loans/summary status", rs.status_code, 200)
    if rs.status_code == 200:
        data = rs.json()
        for k in ["total_lent", "total_borrowed", "total_lent_remaining",
                  "total_borrowed_remaining", "lent_people_count",
                  "borrowed_people_count", "net_position", "loan_count"]:
            truth(f"summary has '{k}'", k in data)


# ============================================================
# 13) Loans full CRUD (lent & borrowed) with cascade
# ============================================================
LENT_ID = None
BORROWED_ID = None


def t_loans_crud():
    print("\n--- 13) POST/GET/PUT/DELETE /api/loans ---")
    global LENT_ID, BORROWED_ID
    # POST lent
    p_lent = {
        "person_name": "QA Smoke Rajesh Kumar",
        "type": "lent",
        "purpose": "Personal Loan",
        "amount": 8000,
        "start_date": datetime(2026, 2, 1).isoformat(),
        "due_date": datetime(2026, 8, 1).isoformat(),
        "interest_rate": 0,
        "notes": "smoke",
    }
    r1 = post("/loans", p_lent)
    eq("POST /loans lent status", r1.status_code, 200)
    if r1.status_code == 200:
        LENT_ID = r1.json().get("_id")
        eq("lent status=active", r1.json().get("status"), "active")
        eq("lent remaining=amount", r1.json().get("remaining_amount"), 8000.0)

    # POST borrowed
    p_bor = {
        "person_name": "QA Smoke Priya Sharma",
        "type": "borrowed",
        "purpose": "Emergency",
        "amount": 3000,
        "start_date": datetime(2026, 2, 5).isoformat(),
        "notes": "smoke",
    }
    r2 = post("/loans", p_bor)
    eq("POST /loans borrowed status", r2.status_code, 200)
    if r2.status_code == 200:
        BORROWED_ID = r2.json().get("_id")

    # GET by id
    if LENT_ID:
        r3 = get(f"/loans/{LENT_ID}")
        eq("GET /loans/{id} status", r3.status_code, 200)
        truth("GET /loans/{id} has payments[]",
              r3.status_code == 200 and isinstance(r3.json().get("payments"), list))

    # PUT
    if LENT_ID:
        r4 = put(f"/loans/{LENT_ID}", {"notes": "smoke updated", "amount": 8500})
        eq("PUT /loans/{id} status", r4.status_code, 200)
        if r4.status_code == 200:
            eq("PUT updated amount", r4.json().get("amount"), 8500.0)


# ============================================================
# 14+15) Payments add (partial -> settled) + delete (reverts)
# ============================================================
def t_payments():
    print("\n--- 14+15) /loans/{id}/payments ---")
    if not LENT_ID:
        f("payments precond", "no lent loan id")
        return

    # First payment 4000 -> partial (loan amount is now 8500)
    pay1 = post(f"/loans/{LENT_ID}/payments", {
        "amount": 4000,
        "date": datetime(2026, 3, 1).isoformat(),
        "notes": "first installment",
    })
    eq("POST payment 1 status", pay1.status_code, 200)
    pay1_id = pay1.json().get("_id") if pay1.status_code == 200 else None
    # Verify loan status updated to partial via GET
    if pay1.status_code == 200:
        rv = get(f"/loans/{LENT_ID}")
        if rv.status_code == 200:
            eq("loan status=partial after 4000", rv.json().get("status"), "partial")
            eq("loan remaining=4500 after 4000", rv.json().get("remaining_amount"), 4500.0)

    # Second payment 4500 -> settled
    pay2 = post(f"/loans/{LENT_ID}/payments", {
        "amount": 4500,
        "date": datetime(2026, 4, 1).isoformat(),
        "notes": "final installment",
    })
    eq("POST payment 2 status", pay2.status_code, 200)
    pay2_id = pay2.json().get("_id") if pay2.status_code == 200 else None
    if pay2.status_code == 200:
        rv = get(f"/loans/{LENT_ID}")
        if rv.status_code == 200:
            eq("loan status=settled", rv.json().get("status"), "settled")
            eq("loan remaining=0", rv.json().get("remaining_amount"), 0.0)

    # DELETE second payment -> reverts to partial
    if pay2_id:
        d2 = delete(f"/loans/{LENT_ID}/payments/{pay2_id}")
        eq("DELETE payment 2 status", d2.status_code, 200)
        # Verify status reverted
        rv = get(f"/loans/{LENT_ID}")
        if rv.status_code == 200:
            eq("status reverted to partial", rv.json().get("status"), "partial")
            eq("remaining after revert", rv.json().get("remaining_amount"), 4500.0)

    # DELETE first payment -> reverts to active
    if pay1_id:
        d1 = delete(f"/loans/{LENT_ID}/payments/{pay1_id}")
        eq("DELETE payment 1 status", d1.status_code, 200)
        rv2 = get(f"/loans/{LENT_ID}")
        if rv2.status_code == 200:
            eq("status reverted to active", rv2.json().get("status"), "active")


def cleanup():
    print("\n--- CLEANUP ---")
    global TX_INCOME, TX_EXPENSE, LENT_ID, BORROWED_ID
    if TX_INCOME:
        r = delete(f"/transactions/{TX_INCOME}")
        eq("cleanup TX income", r.status_code, 200)
    if TX_EXPENSE:
        r = delete(f"/transactions/{TX_EXPENSE}")
        eq("cleanup TX expense", r.status_code, 200)
    if LENT_ID:
        r = delete(f"/loans/{LENT_ID}")
        eq("cleanup loan lent", r.status_code, 200)
    if BORROWED_ID:
        r = delete(f"/loans/{BORROWED_ID}")
        eq("cleanup loan borrowed", r.status_code, 200)


def main():
    print(f"=== Fincare backend smoke regression against {BASE_URL} ===")
    try:
        t_root()
        t_categories()
        t_budget()
        t_category_budgets()
        t_savings_goals()
        t_transactions()
        t_budget_summary()
        t_import_budget()
        t_templates_list()
        t_apply_template()
        t_loans_list_summary()
        t_loans_crud()
        t_payments()
    finally:
        cleanup()

    print(f"\n=== RESULTS: {len(PASS)} pass / {len(FAIL)} fail ===")
    if FAIL:
        print("\nFailures:")
        for n, r in FAIL:
            print(f"  - {n}: {r}")
        sys.exit(1)


if __name__ == "__main__":
    main()
