"""
Comprehensive backend regression tests for Fincare Budget API.
Tests EVERY endpoint with positive cases, edge cases, and error handling.
"""
import os
import sys
import requests
from pathlib import Path

# Read EXPO_PUBLIC_BACKEND_URL from frontend env
FRONTEND_ENV = Path("/app/frontend/.env")
BASE_URL = None
for line in FRONTEND_ENV.read_text().splitlines():
    if line.startswith("EXPO_PUBLIC_BACKEND_URL="):
        BASE_URL = line.split("=", 1)[1].strip().strip('"').rstrip("/")
        break

if not BASE_URL:
    print("ERROR: Could not read EXPO_PUBLIC_BACKEND_URL")
    sys.exit(1)

API = f"{BASE_URL}/api"
print(f"Testing against: {API}")
print("=" * 70)

results = {"pass": 0, "fail": 0, "errors": []}


def check(name, cond, detail=""):
    if cond:
        results["pass"] += 1
        print(f"  PASS: {name}")
    else:
        results["fail"] += 1
        results["errors"].append(f"{name}: {detail}")
        print(f"  FAIL: {name} -- {detail}")


def section(t):
    print(f"\n{'='*70}\n{t}\n{'='*70}")


# Track resources for cleanup
created_cat_budgets = []
created_goals = []
created_transactions = []
created_categories = []

# Mongo direct access for setup/teardown
import pymongo
mongo_client = pymongo.MongoClient(os.environ.get("MONGO_URL",
                                                  "mongodb://localhost:27017"))
db = mongo_client["test_database"]

# =========================================================================
# 1) GET /api/ root health check
# =========================================================================
section("1) GET /api/ root health check")
r = requests.get(f"{API}/")
check("Root status 200", r.status_code == 200, f"got {r.status_code}")
data = r.json()
check("Root has message", data.get("message") == "Fincare Budget API",
      f"got {data}")
check("Root has version", data.get("version") == "1.0.0", f"got {data}")

# =========================================================================
# 2) GET /api/categories and POST /api/categories/seed (idempotent)
# =========================================================================
section("2) Categories - GET + seed idempotency")
r = requests.get(f"{API}/categories")
check("GET /categories status 200", r.status_code == 200, f"got {r.status_code}")
cats_initial = r.json()
check("GET /categories returns list", isinstance(cats_initial, list),
      f"got {type(cats_initial)}")
initial_count = len(cats_initial)

r1 = requests.post(f"{API}/categories/seed")
check("POST /categories/seed status 200", r1.status_code == 200,
      f"got {r1.status_code}: {r1.text}")

r2 = requests.post(f"{API}/categories/seed")
check("Second seed status 200", r2.status_code == 200,
      f"got {r2.status_code}: {r2.text}")

r = requests.get(f"{API}/categories")
cats_after = r.json()
# Idempotency means count after second seed is same as after first
check("Seed idempotent (no extra rows on 2nd seed)",
      len(cats_after) >= initial_count and
      r2.json().get("message") == "Categories already exist" or
      len(cats_after) == 10,
      f"initial={initial_count} after={len(cats_after)} 2nd={r2.json()}")

default_names = {"Home", "Food & Dining", "Transport", "Shopping",
                 "Entertainment", "Travel", "Investments", "Health",
                 "Education", "Others"}
have_names = {c["name"] for c in cats_after}
check("Default categories all present",
      default_names.issubset(have_names),
      f"missing {default_names - have_names}")

# =========================================================================
# 3) POST /api/categories - create custom
# =========================================================================
section("3) POST /api/categories - custom")
r = requests.post(f"{API}/categories", json={
    "name": "Pet Care", "icon": "paw", "type": "expense", "default_budget": 500.0
})
check("POST /categories status 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
if r.status_code == 200:
    cat = r.json()
    check("Custom category is_custom=true", cat.get("is_custom") is True,
          f"got {cat}")
    check("Custom category name", cat.get("name") == "Pet Care", f"got {cat}")
    created_categories.append(cat.get("_id"))

# =========================================================================
# 4) GET /api/budget — 404 first then 200
# =========================================================================
section("4) GET /api/budget — 404 / 200 lifecycle")
db.budgets.delete_many({"user_id": "default_user"})

r = requests.get(f"{API}/budget")
check("GET /budget 404 when none exists", r.status_code == 404,
      f"got {r.status_code}: {r.text}")

# =========================================================================
# 5) POST /api/budget - create + update
# =========================================================================
section("5) POST /api/budget - create + update")
r = requests.post(f"{API}/budget", json={
    "total_budget": 50000.0,
    "period": "monthly",
    "start_date": "2025-11-01T00:00:00",
    "currency": "USD"
})
check("POST /budget create 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
if r.status_code == 200:
    b = r.json()
    check("Budget total_budget=50000", b.get("total_budget") == 50000.0,
          f"got {b}")
    check("Budget user_id=default_user", b.get("user_id") == "default_user",
          f"got {b}")

r = requests.get(f"{API}/budget")
check("GET /budget after create 200", r.status_code == 200, f"got {r.status_code}")

r = requests.post(f"{API}/budget", json={
    "total_budget": 75000.0,
    "period": "monthly",
    "start_date": "2025-11-01T00:00:00",
    "currency": "INR"
})
check("POST /budget update 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
if r.status_code == 200:
    b = r.json()
    check("Budget updated to 75000", b.get("total_budget") == 75000.0,
          f"got {b}")
    check("Budget currency updated INR", b.get("currency") == "INR",
          f"got {b}")

# =========================================================================
# 6+7) Category-budgets list + create + dup
# =========================================================================
section("6+7) Category-budgets list + create + duplicate rejection")
TEST_MONTH = 11
TEST_YEAR = 2025

db.category_budgets.delete_many({"user_id": "default_user",
                                 "month": TEST_MONTH, "year": TEST_YEAR})

r = requests.get(f"{API}/category-budgets",
                 params={"month": TEST_MONTH, "year": TEST_YEAR})
check("GET /category-budgets 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
check("Empty initial list", r.json() == [], f"got {r.json()}")

r = requests.post(f"{API}/category-budgets", json={
    "category_name": "Food & Dining",
    "category_icon": "restaurant",
    "budget_amount": 8000.0,
    "period": "monthly",
    "alert_limit": 80.0,
    "notes": "Eating out budget",
    "month": TEST_MONTH,
    "year": TEST_YEAR
})
check("POST /category-budgets 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
food_cb_id = None
if r.status_code == 200:
    cb = r.json()
    food_cb_id = cb.get("_id")
    created_cat_budgets.append(food_cb_id)
    check("CB budget_amount=8000", cb.get("budget_amount") == 8000.0, f"got {cb}")
    check("CB spent=0", cb.get("spent") == 0.0, f"got {cb}")

r = requests.post(f"{API}/category-budgets", json={
    "category_name": "Transport",
    "category_icon": "car",
    "budget_amount": 3000.0,
    "period": "monthly",
    "alert_limit": 75.0,
    "month": TEST_MONTH,
    "year": TEST_YEAR
})
check("POST /category-budgets second category 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
transport_cb_id = None
if r.status_code == 200:
    transport_cb_id = r.json().get("_id")
    created_cat_budgets.append(transport_cb_id)

r = requests.post(f"{API}/category-budgets", json={
    "category_name": "Food & Dining",
    "category_icon": "restaurant",
    "budget_amount": 9999.0,
    "period": "monthly",
    "alert_limit": 90.0,
    "month": TEST_MONTH,
    "year": TEST_YEAR
})
check("Duplicate category-budget rejected 400", r.status_code == 400,
      f"got {r.status_code}: {r.text}")

r = requests.get(f"{API}/category-budgets",
                 params={"month": TEST_MONTH, "year": TEST_YEAR})
check("List has 2 budgets", len(r.json()) == 2, f"got {r.json()}")

r = requests.get(f"{API}/category-budgets",
                 params={"month": 1, "year": 2099})
check("Filter empty month returns []", r.json() == [], f"got {r.json()}")

# =========================================================================
# 8) PUT /api/category-budgets/{id}
# =========================================================================
section("8) PUT /category-budgets/{id}")
r = requests.put(f"{API}/category-budgets/not-an-objectid", json={
    "budget_amount": 100.0
})
check("PUT invalid id -> 400", r.status_code == 400,
      f"got {r.status_code}: {r.text}")

r = requests.put(f"{API}/category-budgets/507f1f77bcf86cd799439011", json={
    "budget_amount": 100.0
})
check("PUT missing id -> 404", r.status_code == 404,
      f"got {r.status_code}: {r.text}")

if food_cb_id:
    r = requests.put(f"{API}/category-budgets/{food_cb_id}", json={
        "budget_amount": 9500.0,
        "alert_limit": 70.0,
        "notes": "Updated notes"
    })
    check("PUT update success 200", r.status_code == 200,
          f"got {r.status_code}: {r.text}")
    if r.status_code == 200:
        cb = r.json()
        check("Updated budget_amount=9500", cb.get("budget_amount") == 9500.0,
              f"got {cb}")
        check("Updated alert_limit=70", cb.get("alert_limit") == 70.0,
              f"got {cb}")
        check("Updated notes", cb.get("notes") == "Updated notes", f"got {cb}")

# =========================================================================
# 9) DELETE /api/category-budgets/{id}
# =========================================================================
section("9) DELETE /category-budgets/{id}")
r = requests.delete(f"{API}/category-budgets/not-an-objectid")
check("DELETE invalid id -> 400", r.status_code == 400,
      f"got {r.status_code}: {r.text}")

r = requests.delete(f"{API}/category-budgets/507f1f77bcf86cd799439011")
check("DELETE missing id -> 404", r.status_code == 404,
      f"got {r.status_code}: {r.text}")

r = requests.post(f"{API}/category-budgets", json={
    "category_name": "Entertainment",
    "category_icon": "film",
    "budget_amount": 1500.0,
    "month": TEST_MONTH,
    "year": TEST_YEAR
})
temp_cb_id = r.json().get("_id") if r.status_code == 200 else None
if temp_cb_id:
    r = requests.delete(f"{API}/category-budgets/{temp_cb_id}")
    check("DELETE existing budget 200", r.status_code == 200,
          f"got {r.status_code}: {r.text}")
    r2 = requests.delete(f"{API}/category-budgets/{temp_cb_id}")
    check("Re-DELETE same id -> 404", r2.status_code == 404,
          f"got {r2.status_code}: {r2.text}")

# =========================================================================
# 10) GET /api/savings-goals - list
# =========================================================================
section("10) GET /api/savings-goals")
r = requests.get(f"{API}/savings-goals")
check("GET /savings-goals 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
check("Returns list", isinstance(r.json(), list), f"got {type(r.json())}")

# =========================================================================
# 11) POST /api/savings-goals - with ISO date string
# =========================================================================
section("11) POST /api/savings-goals - ISO date string")
r = requests.post(f"{API}/savings-goals", json={
    "goal_amount": 100000.0,
    "target_date": "2026-12-31",
    "notes": "Vacation fund"
})
check("POST savings-goal with ISO date 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
goal_id = None
if r.status_code == 200:
    g = r.json()
    goal_id = g.get("_id")
    created_goals.append(goal_id)
    check("Goal amount=100000", g.get("goal_amount") == 100000.0, f"got {g}")
    check("Goal current_amount=0", g.get("current_amount") == 0.0, f"got {g}")
    check("Goal target_date stored",
          str(g.get("target_date")).startswith("2026-12-31"),
          f"got target_date={g.get('target_date')}")

# =========================================================================
# 12) PUT /api/savings-goals/{id}
# =========================================================================
section("12) PUT /api/savings-goals/{id}")
r = requests.put(f"{API}/savings-goals/not-valid", json={"goal_amount": 1.0})
check("PUT savings-goal invalid id -> 400", r.status_code == 400,
      f"got {r.status_code}: {r.text}")

r = requests.put(f"{API}/savings-goals/507f1f77bcf86cd799439011",
                 json={"goal_amount": 1.0})
check("PUT savings-goal missing id -> 404", r.status_code == 404,
      f"got {r.status_code}: {r.text}")

if goal_id:
    r = requests.put(f"{API}/savings-goals/{goal_id}", json={
        "goal_amount": 150000.0,
        "current_amount": 25000.0,
        "target_date": "2027-06-30",
        "notes": "Updated vacation fund"
    })
    check("PUT savings-goal success 200", r.status_code == 200,
          f"got {r.status_code}: {r.text}")
    if r.status_code == 200:
        g = r.json()
        check("Goal amount updated 150000", g.get("goal_amount") == 150000.0,
              f"got {g}")
        check("Current amount updated 25000",
              g.get("current_amount") == 25000.0, f"got {g}")
        check("Goal target_date updated",
              str(g.get("target_date")).startswith("2027-06-30"),
              f"got target_date={g.get('target_date')}")
        check("Goal notes updated",
              g.get("notes") == "Updated vacation fund", f"got {g}")

# =========================================================================
# 13) DELETE /api/savings-goals/{id}
# =========================================================================
section("13) DELETE /api/savings-goals/{id}")
r = requests.delete(f"{API}/savings-goals/not-valid")
check("DELETE goal invalid id -> 400", r.status_code == 400,
      f"got {r.status_code}: {r.text}")

r = requests.delete(f"{API}/savings-goals/507f1f77bcf86cd799439011")
check("DELETE goal missing id -> 404", r.status_code == 404,
      f"got {r.status_code}: {r.text}")

r = requests.post(f"{API}/savings-goals", json={
    "goal_amount": 5000.0,
    "target_date": "2026-01-15",
    "notes": "temp"
})
temp_goal_id = r.json().get("_id") if r.status_code == 200 else None
if temp_goal_id:
    r = requests.delete(f"{API}/savings-goals/{temp_goal_id}")
    check("DELETE goal success 200", r.status_code == 200,
          f"got {r.status_code}: {r.text}")
    r2 = requests.delete(f"{API}/savings-goals/{temp_goal_id}")
    check("Re-DELETE goal -> 404", r2.status_code == 404,
          f"got {r2.status_code}: {r2.text}")

# =========================================================================
# 14+15) Transactions GET + POST
# =========================================================================
section("14+15) Transactions GET filters + POST")
db.transactions.delete_many({"user_id": "default_user"})

tx_payloads = [
    {"amount": 1500.0, "category": "Food & Dining", "type": "expense",
     "date": "2025-11-05T10:00:00", "description": "Groceries"},
    {"amount": 800.0, "category": "Food & Dining", "type": "expense",
     "date": "2025-11-15T19:00:00", "description": "Restaurant"},
    {"amount": 1200.0, "category": "Transport", "type": "expense",
     "date": "2025-11-10T08:30:00", "description": "Uber rides"},
    {"amount": 50000.0, "category": "Salary", "type": "income",
     "date": "2025-11-01T09:00:00", "description": "November salary"},
    {"amount": 500.0, "category": "Food & Dining", "type": "expense",
     "date": "2025-10-20T12:00:00", "description": "Old month"},
]

for tx in tx_payloads:
    r = requests.post(f"{API}/transactions", json=tx)
    check(f"POST transaction {tx['description']}", r.status_code == 200,
          f"got {r.status_code}: {r.text}")
    if r.status_code == 200:
        created_transactions.append(r.json().get("_id"))
        body = r.json()
        check(f"  type matches for {tx['description']}",
              body.get("type") == tx["type"], f"got {body}")

r = requests.get(f"{API}/transactions")
check("GET /transactions all 200", r.status_code == 200,
      f"got {r.status_code}")
check("All 5 transactions", len(r.json()) == 5, f"got {len(r.json())}")

r = requests.get(f"{API}/transactions", params={
    "start_date": "2025-11-01T00:00:00",
    "end_date": "2025-11-30T23:59:59"
})
check("GET filter Nov 2025 200", r.status_code == 200, f"got {r.status_code}")
check("4 Nov transactions in range", len(r.json()) == 4,
      f"got {len(r.json())}")

r = requests.get(f"{API}/transactions", params={"category": "Food & Dining"})
check("GET by category 200", r.status_code == 200, f"got {r.status_code}")
check("3 Food transactions", len(r.json()) == 3, f"got {len(r.json())}")

r = requests.get(f"{API}/transactions", params={"type": "income"})
check("GET by type=income 200", r.status_code == 200, f"got {r.status_code}")
check("1 income transaction", len(r.json()) == 1, f"got {len(r.json())}")

r = requests.get(f"{API}/transactions", params={"type": "expense"})
check("GET by type=expense 200", r.status_code == 200, f"got {r.status_code}")
check("4 expense transactions", len(r.json()) == 4, f"got {len(r.json())}")

r = requests.get(f"{API}/transactions", params={
    "type": "expense",
    "category": "Food & Dining",
    "start_date": "2025-11-01T00:00:00",
    "end_date": "2025-11-30T23:59:59"
})
check("Combined filter 2 results", len(r.json()) == 2,
      f"got {len(r.json())}")

# =========================================================================
# 16) GET /api/transactions/{id}
# =========================================================================
section("16) GET /transactions/{id}")
r = requests.get(f"{API}/transactions/not-valid")
check("GET tx invalid id -> 400", r.status_code == 400,
      f"got {r.status_code}: {r.text}")

r = requests.get(f"{API}/transactions/507f1f77bcf86cd799439011")
check("GET tx missing id -> 404", r.status_code == 404,
      f"got {r.status_code}: {r.text}")

if created_transactions:
    tid = created_transactions[0]
    r = requests.get(f"{API}/transactions/{tid}")
    check("GET tx by id success 200", r.status_code == 200,
          f"got {r.status_code}: {r.text}")
    if r.status_code == 200:
        check("Returned tx has same id", r.json().get("_id") == tid,
              f"got {r.json()}")

# =========================================================================
# 17) DELETE /api/transactions/{id}
# =========================================================================
section("17) DELETE /transactions/{id}")
r = requests.delete(f"{API}/transactions/not-valid")
check("DELETE tx invalid id -> 400", r.status_code == 400,
      f"got {r.status_code}: {r.text}")

r = requests.delete(f"{API}/transactions/507f1f77bcf86cd799439011")
check("DELETE tx missing id -> 404", r.status_code == 404,
      f"got {r.status_code}: {r.text}")

if len(created_transactions) >= 5:
    old_id = created_transactions[4]
    r = requests.delete(f"{API}/transactions/{old_id}")
    check("DELETE tx success 200", r.status_code == 200,
          f"got {r.status_code}: {r.text}")
    created_transactions.remove(old_id)
    r2 = requests.delete(f"{API}/transactions/{old_id}")
    check("Re-DELETE tx -> 404", r2.status_code == 404,
          f"got {r2.status_code}: {r2.text}")

# =========================================================================
# 18) GET /api/budget-summary
# =========================================================================
section("18) GET /budget-summary aggregation")
r = requests.get(f"{API}/budget-summary",
                 params={"month": TEST_MONTH, "year": TEST_YEAR})
check("GET /budget-summary 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
if r.status_code == 200:
    s = r.json()
    check("Summary month=11", s.get("month") == 11, f"got {s.get('month')}")
    check("Summary year=2025", s.get("year") == 2025, f"got {s.get('year')}")
    check("total_spent=3500", s.get("total_spent") == 3500.0,
          f"got {s.get('total_spent')}")
    check("expenses=3500", s.get("expenses") == 3500.0,
          f"got {s.get('expenses')}")
    check("income=50000", s.get("income") == 50000.0,
          f"got {s.get('income')}")
    check("savings=46500", s.get("savings") == 46500.0,
          f"got {s.get('savings')}")
    expected_rate = round(46500.0 / 50000.0 * 100, 2)
    check(f"savings_rate={expected_rate}",
          s.get("savings_rate") == expected_rate,
          f"got {s.get('savings_rate')}")
    cats = s.get("categories", [])
    check("2 category entries", len(cats) == 2, f"got {len(cats)}")
    food_entry = next((c for c in cats if c["category"] == "Food & Dining"),
                      None)
    transport_entry = next((c for c in cats if c["category"] == "Transport"),
                           None)
    check("Food category present", food_entry is not None,
          f"cats={cats}")
    if food_entry:
        check("Food spent=2300", food_entry["spent"] == 2300.0,
              f"got {food_entry}")
        check("Food budget=9500", food_entry["budget"] == 9500.0,
              f"got {food_entry}")
        check("Food remaining=7200",
              food_entry["remaining"] == 7200.0, f"got {food_entry}")
    check("Transport category present", transport_entry is not None,
          f"cats={cats}")
    if transport_entry:
        check("Transport spent=1200",
              transport_entry["spent"] == 1200.0, f"got {transport_entry}")

# Empty month summary
r = requests.get(f"{API}/budget-summary",
                 params={"month": 1, "year": 2099})
check("Summary empty month 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")
if r.status_code == 200:
    s = r.json()
    check("Empty: total_spent=0", s.get("total_spent") == 0.0,
          f"got {s.get('total_spent')}")
    check("Empty: expenses=0", s.get("expenses") == 0.0,
          f"got {s.get('expenses')}")
    check("Empty: categories=[]", s.get("categories") == [],
          f"got {s.get('categories')}")

# =========================================================================
# 19) POST /api/import-budget
# =========================================================================
section("19) POST /import-budget")
db.category_budgets.delete_many({"user_id": "default_user",
                                 "month": 12, "year": 2025})

r = requests.post(f"{API}/import-budget",
                  params={"from_month": 1, "from_year": 2099,
                          "to_month": 2, "to_year": 2099})
check("Import empty source -> 404", r.status_code == 404,
      f"got {r.status_code}: {r.text}")

r = requests.post(f"{API}/import-budget",
                  params={"from_month": TEST_MONTH, "from_year": TEST_YEAR,
                          "to_month": 12, "to_year": 2025})
check("Import success -> 200", r.status_code == 200,
      f"got {r.status_code}: {r.text}")

r = requests.get(f"{API}/category-budgets",
                 params={"month": 12, "year": 2025})
imported = r.json()
check("Imported list has 2 budgets", len(imported) == 2,
      f"got {len(imported)}: {imported}")
if imported:
    for b in imported:
        check(f"Imported {b.get('category_name')} spent=0",
              b.get("spent") == 0.0, f"got {b}")
        created_cat_budgets.append(b.get("_id"))
    food_imp = next((b for b in imported
                     if b["category_name"] == "Food & Dining"), None)
    if food_imp:
        check("Imported Food budget=9500 (preserved)",
              food_imp.get("budget_amount") == 9500.0, f"got {food_imp}")

r = requests.post(f"{API}/import-budget",
                  params={"from_month": TEST_MONTH, "from_year": TEST_YEAR,
                          "to_month": 12, "to_year": 2025})
check("Import dup target -> 400", r.status_code == 400,
      f"got {r.status_code}: {r.text}")

# =========================================================================
# CLEANUP
# =========================================================================
section("CLEANUP")
for cbid in created_cat_budgets:
    requests.delete(f"{API}/category-budgets/{cbid}")
db.category_budgets.delete_many({"user_id": "default_user",
                                 "month": TEST_MONTH, "year": TEST_YEAR})
db.category_budgets.delete_many({"user_id": "default_user",
                                 "month": 12, "year": 2025})
for gid in created_goals:
    requests.delete(f"{API}/savings-goals/{gid}")
for tid in created_transactions:
    requests.delete(f"{API}/transactions/{tid}")
db.transactions.delete_many({"user_id": "default_user"})

from bson import ObjectId
for cid in created_categories:
    if cid:
        try:
            db.categories.delete_one({"_id": ObjectId(cid)})
        except Exception:
            pass

print("\nCleanup complete")

# =========================================================================
# REPORT
# =========================================================================
print("\n" + "=" * 70)
print(f"RESULTS: {results['pass']} passed, {results['fail']} failed")
print("=" * 70)
if results["errors"]:
    print("\nFAILURES:")
    for e in results["errors"]:
        print(f" - {e}")
sys.exit(0 if results["fail"] == 0 else 1)
