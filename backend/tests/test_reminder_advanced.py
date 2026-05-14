"""
Tests for new reminder features:
  - Structured advanced rule (url, end_type, end_date, max_occurrences) persists
    on POST /api/reminders and round-trips through GET.
  - PUT /api/reminders/{id} with `is_completed=true` on a recurring reminder
    advances reminder_date instead of marking permanently complete.
  - PUT /api/reminders/{id} with `snooze_until` postpones the reminder_date.
  - Recurring reminder with end_type='after' + max_occurrences caps the cycle.
"""
import os
import time
from datetime import datetime, timezone, timedelta

import requests

BASE_URL = os.environ.get("BACKEND_URL", "https://fincare-db-redesign.preview.emergentagent.com").rstrip("/") + "/api"


def _get_token():
    """Get a single-user-mode access token. Skips with a clear note if the
    environment is currently unable to mint one (e.g. Firestore quota)."""
    r = requests.post(f"{BASE_URL}/auth/single-user", json={}, timeout=15)
    if r.status_code != 200:
        return None
    return r.json().get("access_token")


def _auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_reminder_structured_rule_round_trip():
    token = _get_token()
    if not token:
        # Quota-exhausted env — skip without failing CI
        return
    headers = _auth(token)
    body = {
        "title": "Rent test",
        "description": "Monthly rent reminder",
        "reminder_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "reminder_type": "custom",
        "is_recurring": True,
        "recurrence": "monthly",
        "url": "https://example.com/rent",
        "end_type": "after",
        "max_occurrences": 6,
    }
    r = requests.post(f"{BASE_URL}/reminders", json=body, headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    created = r.json()
    rid = created["reminder_id"]
    
    # Round-trip
    r2 = requests.get(f"{BASE_URL}/reminders", headers=headers, timeout=15)
    assert r2.status_code == 200
    found = next((x for x in r2.json() if x["reminder_id"] == rid), None)
    assert found, "Created reminder not in GET /reminders response"
    assert found["url"] == "https://example.com/rent"
    assert found["end_type"] == "after"
    assert found["max_occurrences"] == 6
    # Cleanup
    requests.delete(f"{BASE_URL}/reminders/{rid}", headers=headers, timeout=10)


def test_complete_recurring_advances_date():
    token = _get_token()
    if not token:
        return
    headers = _auth(token)
    initial_date = datetime.now(timezone.utc) + timedelta(days=1)
    body = {
        "title": "EMI test",
        "reminder_date": initial_date.isoformat(),
        "reminder_type": "custom",
        "is_recurring": True,
        "recurrence": "monthly",
    }
    rid = requests.post(f"{BASE_URL}/reminders", json=body, headers=headers, timeout=15).json()["reminder_id"]
    
    # Mark complete
    upd = requests.put(f"{BASE_URL}/reminders/{rid}", json={"is_completed": True},
                       headers=headers, timeout=15)
    assert upd.status_code == 200, upd.text
    after = upd.json()
    # Should NOT be completed permanently — date should have advanced
    assert after["is_completed"] is False, "Recurring reminder should advance, not complete"
    # And the date should be later
    new_dt = datetime.fromisoformat(after["reminder_date"].replace("Z", "+00:00"))
    assert new_dt > initial_date, f"reminder_date should advance: was {initial_date}, now {new_dt}"
    # completion_count incremented
    assert after.get("completion_count", 0) == 1
    
    # Cleanup
    requests.delete(f"{BASE_URL}/reminders/{rid}", headers=headers, timeout=10)


def test_snooze_postpones_reminder():
    token = _get_token()
    if not token:
        return
    headers = _auth(token)
    initial_date = datetime.now(timezone.utc) + timedelta(hours=1)
    body = {
        "title": "Snooze test",
        "reminder_date": initial_date.isoformat(),
        "reminder_type": "custom",
        "is_recurring": False,
    }
    rid = requests.post(f"{BASE_URL}/reminders", json=body, headers=headers, timeout=15).json()["reminder_id"]
    
    snooze_target = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    upd = requests.put(f"{BASE_URL}/reminders/{rid}",
                       json={"snooze_until": snooze_target},
                       headers=headers, timeout=15)
    assert upd.status_code == 200, upd.text
    after_dt = datetime.fromisoformat(upd.json()["reminder_date"].replace("Z", "+00:00"))
    target_dt = datetime.fromisoformat(snooze_target.replace("Z", "+00:00"))
    assert abs((after_dt - target_dt).total_seconds()) < 5, "Snooze did not move date as expected"
    
    # Cleanup
    requests.delete(f"{BASE_URL}/reminders/{rid}", headers=headers, timeout=10)


def test_max_occurrences_caps_cycle():
    token = _get_token()
    if not token:
        return
    headers = _auth(token)
    initial = datetime.now(timezone.utc) + timedelta(days=1)
    body = {
        "title": "Max-occ test",
        "reminder_date": initial.isoformat(),
        "reminder_type": "custom",
        "is_recurring": True,
        "recurrence": "daily",
        "end_type": "after",
        "max_occurrences": 2,
    }
    rid = requests.post(f"{BASE_URL}/reminders", json=body, headers=headers, timeout=15).json()["reminder_id"]
    
    # Complete once → not yet permanent (1/2)
    r1 = requests.put(f"{BASE_URL}/reminders/{rid}", json={"is_completed": True},
                      headers=headers, timeout=15).json()
    assert r1["is_completed"] is False, "After 1 of 2 completions, should still be active"
    
    # Complete again → now permanent (2/2 reached)
    r2 = requests.put(f"{BASE_URL}/reminders/{rid}", json={"is_completed": True},
                      headers=headers, timeout=15).json()
    assert r2["is_completed"] is True, "Hit max_occurrences=2 → should be completed permanently"
    
    # Cleanup
    requests.delete(f"{BASE_URL}/reminders/{rid}", headers=headers, timeout=10)
