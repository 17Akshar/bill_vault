"""
Re-test for PUT /api/savings-goals/{goal_id} after datetime.date->datetime fix.
"""
import os
import sys
import requests

BASE_URL = "https://budget-refresh-3.preview.emergentagent.com/api"

results = []

def log(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"[{status}] {name} {detail}")
    results.append((name, ok, detail))


def main():
    # 1) Create a savings goal first
    payload = {
        "goal_amount": 10000,
        "target_date": "2027-06-30",
        "notes": "Test"
    }
    r = requests.post(f"{BASE_URL}/savings-goals", json=payload, timeout=30)
    if r.status_code != 200:
        log("1. POST create savings goal", False, f"HTTP {r.status_code}: {r.text}")
        return
    created = r.json()
    goal_id = created.get("id") or created.get("_id")
    if not goal_id:
        log("1. POST create savings goal", False, f"no id in response: {created}")
        return
    log("1. POST create savings goal", True, f"goal_id={goal_id}")

    # 2) PUT with target_date only (ISO date string)
    r = requests.put(f"{BASE_URL}/savings-goals/{goal_id}",
                     json={"target_date": "2027-12-31"}, timeout=30)
    ok = r.status_code == 200
    detail = f"HTTP {r.status_code}"
    if ok:
        body = r.json()
        td = body.get("target_date", "")
        if "2027-12-31" not in str(td):
            ok = False
            detail += f" target_date not updated: {td}"
        else:
            detail += f" target_date={td}"
    else:
        detail += f" body={r.text}"
    log("2. PUT target_date only -> 200 with updated target_date", ok, detail)

    # 3) PUT with goal_amount + current_amount + notes (no target_date)
    r = requests.put(f"{BASE_URL}/savings-goals/{goal_id}",
                     json={"goal_amount": 12500, "current_amount": 1500,
                           "notes": "Updated test note"}, timeout=30)
    ok = r.status_code == 200
    detail = f"HTTP {r.status_code}"
    if ok:
        body = r.json()
        if (body.get("goal_amount") != 12500
                or body.get("current_amount") != 1500
                or body.get("notes") != "Updated test note"):
            ok = False
            detail += f" fields mismatch: {body}"
    else:
        detail += f" body={r.text}"
    log("3. PUT amounts+notes (no target_date) -> 200", ok, detail)

    # 4) PUT with target_date AND goal_amount
    r = requests.put(f"{BASE_URL}/savings-goals/{goal_id}",
                     json={"target_date": "2028-03-15", "goal_amount": 15000},
                     timeout=30)
    ok = r.status_code == 200
    detail = f"HTTP {r.status_code}"
    if ok:
        body = r.json()
        td = str(body.get("target_date", ""))
        if "2028-03-15" not in td or body.get("goal_amount") != 15000:
            ok = False
            detail += f" mismatch td={td} amt={body.get('goal_amount')}"
        else:
            detail += f" td={td} amt={body.get('goal_amount')}"
    else:
        detail += f" body={r.text}"
    log("4. PUT target_date+goal_amount -> 200, both updated", ok, detail)

    # 5) PUT with invalid id
    r = requests.put(f"{BASE_URL}/savings-goals/not-valid",
                     json={"goal_amount": 100}, timeout=30)
    ok = r.status_code == 400
    log("5. PUT invalid id -> 400", ok, f"HTTP {r.status_code} body={r.text[:120]}")

    # 6) PUT with valid-format but non-existent id
    r = requests.put(f"{BASE_URL}/savings-goals/507f1f77bcf86cd799439011",
                     json={"goal_amount": 100}, timeout=30)
    ok = r.status_code == 404
    log("6. PUT valid-format missing id -> 404", ok, f"HTTP {r.status_code} body={r.text[:120]}")

    # 7) Cleanup: delete the test goal
    r = requests.delete(f"{BASE_URL}/savings-goals/{goal_id}", timeout=30)
    ok = r.status_code == 200
    log("7. Cleanup DELETE", ok, f"HTTP {r.status_code}")

    failed = [n for n, ok, _ in results if not ok]
    print("\n=== SUMMARY ===")
    print(f"Total: {len(results)}, Passed: {len(results)-len(failed)}, Failed: {len(failed)}")
    if failed:
        print("Failed:", failed)
        sys.exit(1)


if __name__ == "__main__":
    main()
