#!/usr/bin/env python3
"""
CRITICAL BUG FIX VERIFICATION - Transaction Balance Updates
Tests that $inc and $set operators work together in Firestore wrapper.
"""
import requests
import json
import sys
from datetime import datetime

BASE_URL = "https://fincare-loans-emi.preview.emergentagent.com/api"

def _print(msg):
    print(msg, flush=True)

def main():
    token = None
    session = requests.Session()

    # Step 1: Authenticate (single-user mode)
    _print("\n[STEP 1] Authenticate via /api/auth/single-user ...")
    r = session.post(f"{BASE_URL}/auth/single-user", timeout=30)
    _print(f"  -> {r.status_code}")
    if r.status_code != 200:
        # Try alternative endpoints
        _print(f"  body: {r.text[:300]}")
        _print("  Trying /api/auth/login with test user ...")
        r = session.post(f"{BASE_URL}/auth/login",
                         json={"email": "fulltest@test.com", "password": "FullTest123!"}, timeout=30)
        _print(f"  login -> {r.status_code} body: {r.text[:200]}")
        if r.status_code != 200:
            _print("  Registering test user ...")
            r = session.post(f"{BASE_URL}/auth/register",
                             json={"email": "balance@test.com", "password": "Balance123!",
                                   "name": "Balance Tester", "mobile_number": "9998887776",
                                   "security_question": "Fav color?", "security_answer": "Blue"},
                             timeout=30)
            _print(f"  register -> {r.status_code} body: {r.text[:200]}")
    try:
        data = r.json()
    except Exception:
        _print(f"  FAIL: non-JSON response: {r.text[:200]}")
        return 1
    token = data.get("access_token") or data.get("token")
    if not token:
        _print(f"  FAIL: no token: {data}")
        return 1
    _print(f"  OK - token obtained")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # Step 2: Create test account
    _print("\n[STEP 2] Create test account with initial_balance=10000 ...")
    r = session.post(f"{BASE_URL}/accounts", headers=headers,
                     json={"name": "Balance Test Account",
                           "account_type": "bank",
                           "initial_balance": 10000}, timeout=30)
    _print(f"  -> {r.status_code}  body: {r.text[:300]}")
    if r.status_code != 200:
        return 1
    acct = r.json()
    account_id = acct["account_id"]
    _print(f"  OK account_id={account_id} initial_balance={acct.get('current_balance', acct.get('balance'))}")

    # Step 3: Add income of 5000
    _print("\n[STEP 3] POST /api/income amount=5000 ...")
    r = session.post(f"{BASE_URL}/income", headers=headers,
                     json={"account_id": account_id, "amount": 5000,
                           "category": "salary", "source": "Test Income",
                           "date": "2025-06-25T12:00:00.000Z"}, timeout=30)
    _print(f"  -> {r.status_code} body: {r.text[:300]}")
    if r.status_code != 200:
        return 1
    income_id = r.json().get("income_id")

    # Step 4: CRITICAL - verify balance = 15000
    _print("\n[STEP 4] CRITICAL: GET /api/accounts/{id} should show balance=15000 ...")
    r = session.get(f"{BASE_URL}/accounts/{account_id}", headers=headers, timeout=30)
    _print(f"  -> {r.status_code} body: {r.text[:300]}")
    if r.status_code != 200:
        # try list endpoint
        r = session.get(f"{BASE_URL}/accounts", headers=headers, timeout=30)
        accounts = r.json() if r.status_code == 200 else []
        acct = next((a for a in accounts if a.get("account_id") == account_id), None)
    else:
        acct = r.json()
    bal = (acct.get("current_balance") if acct else None) or (acct.get("balance") if acct else None)
    if bal == 15000:
        _print(f"  ✅ PASS: balance = {bal} (expected 15000)")
        step4_pass = True
    else:
        _print(f"  ❌ FAIL: balance = {bal} (expected 15000)")
        step4_pass = False

    # Step 5: Add expense of 2000
    _print("\n[STEP 5] POST /api/expenses amount=2000 ...")
    r = session.post(f"{BASE_URL}/expenses", headers=headers,
                     json={"account_id": account_id, "amount": 2000,
                           "category": "food", "description": "Test Expense",
                           "payment_type": "bank",
                           "date": "2025-06-25T12:00:00.000Z"}, timeout=30)
    _print(f"  -> {r.status_code} body: {r.text[:300]}")
    expense_id = r.json().get("expense_id") if r.status_code == 200 else None

    # Step 6: Verify balance = 13000
    _print("\n[STEP 6] CRITICAL: GET /api/accounts/{id} should show balance=13000 ...")
    r = session.get(f"{BASE_URL}/accounts/{account_id}", headers=headers, timeout=30)
    if r.status_code != 200:
        r = session.get(f"{BASE_URL}/accounts", headers=headers, timeout=30)
        accounts = r.json() if r.status_code == 200 else []
        acct = next((a for a in accounts if a.get("account_id") == account_id), None)
    else:
        acct = r.json()
    bal = (acct.get("current_balance") if acct else None) or (acct.get("balance") if acct else None)
    if bal == 13000:
        _print(f"  ✅ PASS: balance = {bal} (expected 13000)")
        step6_pass = True
    else:
        _print(f"  ❌ FAIL: balance = {bal} (expected 13000)")
        step6_pass = False

    # Step 7: net-worth
    _print("\n[STEP 7] GET /api/net-worth ...")
    r = session.get(f"{BASE_URL}/net-worth", headers=headers, timeout=30)
    _print(f"  -> {r.status_code} body: {r.text[:400]}")

    # Step 8: cleanup
    _print("\n[STEP 8] Cleanup ...")
    if income_id:
        session.delete(f"{BASE_URL}/income/{income_id}", headers=headers, timeout=30)
    if expense_id:
        session.delete(f"{BASE_URL}/expenses/{expense_id}", headers=headers, timeout=30)
    session.delete(f"{BASE_URL}/accounts/{account_id}", headers=headers, timeout=30)
    _print("  cleanup done")

    print("\n" + "=" * 60)
    if step4_pass and step6_pass:
        print("✅ BALANCE UPDATE FIX IS WORKING")
        return 0
    else:
        print("❌ BALANCE UPDATE FIX IS NOT WORKING")
        print(f"   Step 4 (income +5000 -> 15000): {'PASS' if step4_pass else 'FAIL'}")
        print(f"   Step 6 (expense -2000 -> 13000): {'PASS' if step6_pass else 'FAIL'}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
