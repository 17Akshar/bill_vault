"""
Net Worth Snapshots Module
===========================

Captures daily and monthly point-in-time net-worth snapshots per user so that
cross-month deltas reflect REAL investment-value changes (not just income/
expense flow).

Collection: `net_worth_snapshots`
Schema:
  snapshot_id    str   (per-record unique id)
  user_id        str
  captured_at    datetime (UTC)
  snapshot_type  'daily' | 'monthly' | 'manual'
  total_assets       float   (sum of all positive-balance accounts + investment current values)
  total_liabilities  float   (sum of negative-balance accounts + loans outstanding + credit-card outstanding)
  net_worth          float   (assets - liabilities)
  total_balance      float   (raw sum of account balances; matches dashboard.total_balance)
  investment_value   float   (sum of current investment market values)

Scheduling:
  A lightweight asyncio task started in FastAPI lifespan. Runs hourly and
  triggers captures for any user who hasn't been snapshotted today (daily) or
  this month (monthly). This approach avoids adding APScheduler as a hard dep
  and works inside a single-process supervisor-managed uvicorn worker.

Manual endpoints:
  POST /api/snapshots/capture       - Force-capture a fresh snapshot now
  GET  /api/snapshots               - List my snapshots (optional ?type=daily|monthly)
  GET  /api/snapshots/last-month    - Get my most recent monthly snapshot prior to this month

The dashboard endpoint now PREFERS a real previous-month snapshot for computing
`net_worth_delta_*` when one exists, falling back to the old flow-based
approximation when no snapshot history is available.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from firebase_config import db

logger = logging.getLogger(__name__)
snapshots_router = APIRouter(prefix="/api/snapshots", tags=["snapshots"])

# ==================== CORE COMPUTE ====================

async def _compute_networth(user_id: str) -> dict:
    """
    Compute a fresh net-worth snapshot for the given user.
    Aggregates across accounts, investments, loans, and credit cards.
    """
    # Accounts (asset or liability depending on balance sign)
    accounts = await db.accounts.find(
        {"user_id": user_id, "is_active": True}, {"_id": 0}
    ).to_list(1000)
    total_balance = sum(a.get("balance", 0) for a in accounts)
    positive_bal = sum(a.get("balance", 0) for a in accounts if a.get("balance", 0) > 0)
    negative_bal = sum(a.get("balance", 0) for a in accounts if a.get("balance", 0) < 0)

    # Investments at current value
    investments = await db.investments.find(
        {"user_id": user_id}, {"_id": 0}
    ).to_list(1000)
    investment_value = 0.0
    for inv in investments:
        # Prefer explicit current_value; fall back to amount_invested
        investment_value += float(inv.get("current_value") or inv.get("amount_invested") or 0)

    # Loans outstanding (liability)
    loans = await db.loans.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    loan_outstanding = 0.0
    for ln in loans:
        # outstanding_amount OR principal if still active
        loan_outstanding += float(ln.get("outstanding_amount")
                                  or ln.get("principal") or 0)

    # Credit-card outstanding (liability)
    cards = await db.credit_cards.find({"user_id": user_id}, {"_id": 0}).to_list(1000)
    cc_outstanding = 0.0
    for c in cards:
        cc_outstanding += float(c.get("outstanding_amount") or 0)

    total_assets      = positive_bal + investment_value
    total_liabilities = abs(negative_bal) + loan_outstanding + cc_outstanding
    net_worth         = total_assets - total_liabilities

    return {
        "total_balance":     round(total_balance, 2),
        "total_assets":      round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "net_worth":         round(net_worth, 2),
        "investment_value":  round(investment_value, 2),
    }


async def _save_snapshot(user_id: str, snapshot_type: str = "daily") -> dict:
    """Compute and persist a snapshot. Returns the stored record."""
    metrics = await _compute_networth(user_id)
    now = datetime.now(timezone.utc)
    doc = {
        "snapshot_id":  f"snap_{uuid.uuid4().hex[:16]}",
        "user_id":      user_id,
        "captured_at":  now,
        "snapshot_type": snapshot_type,
        **metrics,
    }
    await db.net_worth_snapshots.insert_one(doc)
    return doc


# ==================== SNAPSHOT-AWARE DELTA LOOKUP ====================

async def get_prev_month_snapshot(user_id: str, reference: datetime) -> Optional[dict]:
    """
    Return the most recent snapshot captured BEFORE the 1st of the
    reference month (i.e., strictly in or before the previous month).
    Used by /api/dashboard to compute accurate net_worth_delta_*.
    """
    month_start = datetime(reference.year, reference.month, 1, tzinfo=timezone.utc)
    snaps = await db.net_worth_snapshots.find(
        {"user_id": user_id, "captured_at": {"$lt": month_start}},
        {"_id": 0},
    ).sort("captured_at", -1).to_list(1)
    return snaps[0] if snaps else None


# ==================== DEDUPE HELPERS ====================

async def _has_snapshot_in_window(user_id: str, snapshot_type: str,
                                  window_start: datetime) -> bool:
    """True if this user already has a snapshot of the given type >= window_start."""
    snaps = await db.net_worth_snapshots.find(
        {
            "user_id": user_id,
            "snapshot_type": snapshot_type,
            "captured_at": {"$gte": window_start},
        },
        {"_id": 0},
    ).to_list(1)
    return len(snaps) > 0


# ==================== SCHEDULER ====================

_scheduler_task: Optional[asyncio.Task] = None
_scheduler_stop = asyncio.Event()


async def _scheduler_loop():
    """
    Runs forever. Every hour it iterates all users and:
      * Captures a 'daily' snapshot if none exists for today (UTC)
      * Captures a 'monthly' snapshot if none exists for this month

    Stops gracefully when _scheduler_stop is set.
    """
    logger.info("[snapshots] scheduler started")
    # Stagger first run by 60s so app startup isn't slowed
    try:
        await asyncio.wait_for(_scheduler_stop.wait(), timeout=60)
        return   # stop requested during startup delay
    except asyncio.TimeoutError:
        pass

    while not _scheduler_stop.is_set():
        try:
            await _scheduler_tick()
        except Exception as e:
            logger.exception(f"[snapshots] scheduler tick failed: {e}")
        # Sleep 1 hour or exit promptly on stop
        try:
            await asyncio.wait_for(_scheduler_stop.wait(), timeout=3600)
        except asyncio.TimeoutError:
            pass
    logger.info("[snapshots] scheduler stopped")


async def _scheduler_tick():
    """Capture outstanding snapshots for every user."""
    users = await db.users.find({}, {"_id": 0}).to_list(5000)
    now = datetime.now(timezone.utc)
    today_start  = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
    month_start  = datetime(now.year, now.month, 1,       tzinfo=timezone.utc)
    daily_count = 0
    monthly_count = 0
    for u in users:
        uid = u.get("user_id")
        if not uid:
            continue
        # Daily
        if not await _has_snapshot_in_window(uid, "daily", today_start):
            try:
                await _save_snapshot(uid, "daily")
                daily_count += 1
            except Exception as e:
                logger.warning(f"[snapshots] daily capture failed for {uid}: {e}")
        # Monthly
        if not await _has_snapshot_in_window(uid, "monthly", month_start):
            try:
                await _save_snapshot(uid, "monthly")
                monthly_count += 1
            except Exception as e:
                logger.warning(f"[snapshots] monthly capture failed for {uid}: {e}")
    if daily_count or monthly_count:
        logger.info(f"[snapshots] tick: captured {daily_count} daily, "
                    f"{monthly_count} monthly across {len(users)} users")


def start_scheduler():
    """Spawn the background loop. Idempotent."""
    global _scheduler_task
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_stop.clear()
        _scheduler_task = asyncio.create_task(_scheduler_loop())


async def stop_scheduler():
    """Graceful stop for FastAPI shutdown."""
    _scheduler_stop.set()
    if _scheduler_task and not _scheduler_task.done():
        try:
            await asyncio.wait_for(_scheduler_task, timeout=5)
        except asyncio.TimeoutError:
            _scheduler_task.cancel()


# ==================== API ENDPOINTS ====================

# Late-import helper to avoid circular import at module load
async def _get_user_from_request(request: Request):
    from server import get_current_user
    return await get_current_user(request)


@snapshots_router.post("/capture")
async def capture_snapshot(request: Request):
    """Manually capture a fresh snapshot right now."""
    user = await _get_user_from_request(request)
    doc = await _save_snapshot(user.user_id, "manual")
    # Serialize datetime for JSON response
    doc = {**doc, "captured_at": doc["captured_at"].isoformat()}
    doc.pop("_id", None)
    return doc


@snapshots_router.get("")
async def list_snapshots(request: Request,
                         type: Optional[str] = None,
                         limit: int = 60):
    """List my snapshots (newest first)."""
    user = await _get_user_from_request(request)
    q = {"user_id": user.user_id}
    if type in {"daily", "monthly", "manual"}:
        q["snapshot_type"] = type
    snaps = await db.net_worth_snapshots.find(q, {"_id": 0}) \
        .sort("captured_at", -1).to_list(min(limit, 365))
    return {"count": len(snaps), "snapshots": snaps}


@snapshots_router.get("/last-month")
async def get_last_month_snapshot(request: Request):
    """Most recent snapshot captured before the 1st of this month."""
    user = await _get_user_from_request(request)
    snap = await get_prev_month_snapshot(user.user_id, datetime.now(timezone.utc))
    if not snap:
        raise HTTPException(status_code=404,
                            detail="No prior-month snapshot found for this user yet")
    return snap
