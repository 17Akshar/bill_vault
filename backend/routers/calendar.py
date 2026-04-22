"""Calendar Events Router"""
from fastapi import APIRouter, Request
from typing import Optional
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["calendar"])


def get_db():
    from routers.deps import db
    return db


async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


@router.get("/calendar/events")
async def get_calendar_events(request: Request, month: int = None, year: int = None):
    """Get all financial events for a given month for calendar view"""
    user = await _get_user(request)
    db = get_db()

    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    start = datetime(y, m, 1, tzinfo=timezone.utc)
    if m == 12:
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(y, m + 1, 1, tzinfo=timezone.utc)

    events = []

    # Bills
    bills = await db.bills.find({
        "user_id": user.user_id,
        "due_date": {"$gte": start.isoformat(), "$lt": end.isoformat()}
    }, {"_id": 0}).to_list(200)
    for b in bills:
        events.append({
            "id": b.get("bill_id"),
            "date": b.get("due_date", "")[:10],
            "title": b.get("name", "Bill"),
            "type": "bill",
            "amount": b.get("amount", 0),
            "status": b.get("payment_status", "unpaid"),
            "color": "#EF4444",
        })

    # Income
    incomes = await db.income.find({
        "user_id": user.user_id,
        "date": {"$gte": start.isoformat(), "$lt": end.isoformat()}
    }, {"_id": 0}).to_list(200)
    for i in incomes:
        events.append({
            "id": i.get("income_id"),
            "date": i.get("date", "")[:10],
            "title": i.get("source", "Income"),
            "type": "income",
            "amount": i.get("amount", 0),
            "color": "#22C55E",
        })

    # Expenses
    expenses = await db.expenses.find({
        "user_id": user.user_id,
        "date": {"$gte": start.isoformat(), "$lt": end.isoformat()}
    }, {"_id": 0}).to_list(200)
    for e in expenses:
        events.append({
            "id": e.get("expense_id"),
            "date": e.get("date", "")[:10],
            "title": e.get("description", e.get("category", "Expense")),
            "type": "expense",
            "amount": e.get("amount", 0),
            "color": "#F59E0B",
        })

    # Reminders
    reminders = await db.reminders.find({
        "user_id": user.user_id,
        "due_date": {"$gte": start.isoformat(), "$lt": end.isoformat()}
    }, {"_id": 0}).to_list(200)
    for r in reminders:
        events.append({
            "id": r.get("reminder_id"),
            "date": r.get("due_date", "")[:10],
            "title": r.get("title", "Reminder"),
            "type": "reminder",
            "amount": r.get("amount", 0),
            "color": "#8B5CF6",
        })

    return {"month": m, "year": y, "events": events}
