"""
Tests for the spec-mandated reminder state transitions:
  - Upcoming → Completed (`is_completed=true` on a non-recurring reminder
    fully marks it complete)
  - Completed → Upcoming (`is_completed=false` moves it back; called the
    "Mark as Upcoming" action in the spec)
  - Listing endpoints respect the is_completed filter consistently
"""
import os
from datetime import datetime, timezone, timedelta

import requests

BASE_URL = os.environ.get(
    "BACKEND_URL",
    "https://cash-flow-hub-81.preview.emergentagent.com",
).rstrip("/") + "/api"


def _get_token():
    r = requests.post(f"{BASE_URL}/auth/single-user", json={}, timeout=15)
    if r.status_code != 200:
        return None
    return r.json().get("access_token")


def _auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def test_upcoming_to_completed_and_back():
    """One-time reminder: complete it, then mark as upcoming again."""
    token = _get_token()
    if not token:
        return
    headers = _auth(token)
    body = {
        "title": "State transition test",
        "reminder_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        "reminder_type": "custom",
        "is_recurring": False,
    }
    rid = requests.post(f"{BASE_URL}/reminders", json=body, headers=headers, timeout=15).json()[
        "reminder_id"
    ]

    # Mark complete
    r1 = requests.put(
        f"{BASE_URL}/reminders/{rid}", json={"is_completed": True}, headers=headers, timeout=15
    ).json()
    assert r1["is_completed"] is True, "Non-recurring reminder should mark complete"

    # Mark as Upcoming (spec name)
    r2 = requests.put(
        f"{BASE_URL}/reminders/{rid}", json={"is_completed": False}, headers=headers, timeout=15
    ).json()
    assert r2["is_completed"] is False, "is_completed=false should move back to upcoming"

    # Confirm GET /reminders?is_completed=true does NOT include it
    upcoming = requests.get(
        f"{BASE_URL}/reminders?is_completed=false", headers=headers, timeout=15
    ).json()
    completed = requests.get(
        f"{BASE_URL}/reminders?is_completed=true", headers=headers, timeout=15
    ).json()
    upcoming_ids = [x["reminder_id"] for x in upcoming]
    completed_ids = [x["reminder_id"] for x in completed]
    assert rid in upcoming_ids
    assert rid not in completed_ids

    # Cleanup
    requests.delete(f"{BASE_URL}/reminders/{rid}", headers=headers, timeout=10)


def test_listing_filters_complete_correctly():
    """Two reminders: one completed, one upcoming. Filters must split them."""
    token = _get_token()
    if not token:
        return
    headers = _auth(token)
    base = datetime.now(timezone.utc) + timedelta(days=1)
    upcoming_id = requests.post(
        f"{BASE_URL}/reminders",
        json={"title": "Upcoming-X", "reminder_date": base.isoformat(),
              "reminder_type": "custom", "is_recurring": False},
        headers=headers, timeout=15,
    ).json()["reminder_id"]
    completed_id = requests.post(
        f"{BASE_URL}/reminders",
        json={"title": "Completed-X", "reminder_date": base.isoformat(),
              "reminder_type": "custom", "is_recurring": False},
        headers=headers, timeout=15,
    ).json()["reminder_id"]
    requests.put(
        f"{BASE_URL}/reminders/{completed_id}", json={"is_completed": True},
        headers=headers, timeout=15,
    )

    upcoming = requests.get(
        f"{BASE_URL}/reminders?is_completed=false", headers=headers, timeout=15
    ).json()
    completed = requests.get(
        f"{BASE_URL}/reminders?is_completed=true", headers=headers, timeout=15
    ).json()
    upcoming_ids = [x["reminder_id"] for x in upcoming]
    completed_ids = [x["reminder_id"] for x in completed]

    assert upcoming_id in upcoming_ids
    assert upcoming_id not in completed_ids
    assert completed_id in completed_ids
    assert completed_id not in upcoming_ids

    # Cleanup
    requests.delete(f"{BASE_URL}/reminders/{upcoming_id}", headers=headers, timeout=10)
    requests.delete(f"{BASE_URL}/reminders/{completed_id}", headers=headers, timeout=10)
