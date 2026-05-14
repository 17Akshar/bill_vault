#!/usr/bin/env python3
"""
Deploy-Verify Smoke Test for the user_id-as-doc-id overwrite bug fix.
Creates a fresh user on the LIVE Firebase-backed backend, writes 3+ records to
each multi-record collection, and asserts they all persist.

Runs against https://cash-flow-hub-81.preview.emergentagent.com/api
"""
import requests
import sys
import time

BASE = "https://cash-flow-hub-81.preview.emergentagent.com/api"

def ok(msg): print(f"  ✅ {msg}")
def fail(msg): print(f"  ❌ {msg}"); sys.exit(1)

def main():
    ts = int(time.time())
    email = f"deployverify+{ts}@test.com"
    pw = f"DeployV{ts}!"

    # Register
    r = requests.post(f"{BASE}/auth/register", json={
        "email": email, "password": pw, "name": "Deploy Verify",
        "mobile_number": f"+91999{ts % 10000000:07d}",
        "security_question": "q?", "security_answer": "a",
    })
    if r.status_code != 200: fail(f"register: {r.status_code} {r.text[:200]}")
    tok = r.json()["access_token"]
    H = {"Authorization": f"Bearer {tok}"}
    ok(f"registered {email}")

    # Account - need for income/expense
    r = requests.post(f"{BASE}/accounts", headers=H, json={
        "name": "DV Bank", "account_type": "bank", "initial_balance": 100000
    })
    acct_id = r.json()["account_id"]
    ok(f"account {acct_id}")

    # --- Multi-record persistence tests ---
    tests = [
        ("income", "income_id", {"account_id": acct_id, "amount": 0,
            "category": "salary", "source": "X", "date": "2026-05-10T12:00:00Z"}),
        ("expenses", "expense_id", {"account_id": acct_id, "amount": 0,
            "category": "food", "description": "X", "payment_type": "bank",
            "date": "2026-05-10T12:00:00Z"}),
        ("bills", "bill_id", {"name": "B-X", "amount": 0, "due_date":
            "2026-06-01T00:00:00Z", "category": "utilities"}),
        ("reminders", "reminder_id", {"title": "R-X", "reminder_type": "bill",
            "reminder_date": "2026-06-01T00:00:00Z"}),
        ("family-members", "family_member_id", {"name": "FM-X",
            "relationship": "spouse", "role": "dependent"}),
    ]
    for endpoint, id_key, base_body in tests:
        created_ids = []
        for i in range(3):
            body = dict(base_body)
            # Vary a distinguishing field so each is unique
            for k in ("name", "title", "source", "description"):
                if k in body: body[k] = f"{body[k]}-{i}"
            for k in ("amount",):
                if k in body: body[k] = 100 * (i + 1)
            r = requests.post(f"{BASE}/{endpoint}", headers=H, json=body)
            if r.status_code != 200:
                fail(f"create {endpoint}[{i}]: {r.status_code} {r.text[:200]}")
            created_ids.append(r.json()[id_key])
        # List and assert all 3 present
        r = requests.get(f"{BASE}/{endpoint}", headers=H)
        if r.status_code != 200: fail(f"list {endpoint}: {r.status_code}")
        items = r.json()
        found = [x[id_key] for x in items if x[id_key] in created_ids]
        if len(found) != 3:
            fail(f"{endpoint}: expected 3, got {len(found)} (items={len(items)})")
        ok(f"{endpoint}: 3 records persist correctly")
        # Cleanup
        for rid in created_ids:
            requests.delete(f"{BASE}/{endpoint}/{rid}", headers=H)

    # Cleanup account
    requests.delete(f"{BASE}/accounts/{acct_id}", headers=H)
    ok("cleanup done")
    print("\n🎉 DEPLOY-VERIFY PASSED — multi-record persistence works on live Firebase backend.\n")

if __name__ == "__main__":
    main()
