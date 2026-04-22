"""MPIN Security Router"""
from fastapi import APIRouter, HTTPException, Request
from datetime import datetime, timezone
import bcrypt

router = APIRouter(prefix="/api", tags=["mpin"])


def get_db():
    from routers.deps import db
    return db


async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


@router.post("/mpin/setup")
async def setup_mpin(request: Request):
    """Set up or update MPIN for quick app access"""
    user = await _get_user(request)
    db = get_db()
    body = await request.json()
    mpin = body.get("mpin", "")

    if not mpin or len(mpin) < 4 or len(mpin) > 6 or not mpin.isdigit():
        raise HTTPException(status_code=400, detail="MPIN must be 4-6 digits")

    hashed = bcrypt.hashpw(mpin.encode(), bcrypt.gensalt()).decode()
    now = datetime.now(timezone.utc)

    await db.user_mpin.update_one(
        {"user_id": user.user_id},
        {"$set": {"mpin_hash": hashed, "is_enabled": True, "updated_at": now}},
        upsert=True
    )
    return {"message": "MPIN set successfully", "is_enabled": True}


@router.post("/mpin/verify")
async def verify_mpin(request: Request):
    """Verify MPIN for app unlock"""
    user = await _get_user(request)
    db = get_db()
    body = await request.json()
    mpin = body.get("mpin", "")

    record = await db.user_mpin.find_one({"user_id": user.user_id})
    if not record or not record.get("is_enabled"):
        raise HTTPException(status_code=404, detail="MPIN not set up")

    if bcrypt.checkpw(mpin.encode(), record["mpin_hash"].encode()):
        return {"verified": True}
    raise HTTPException(status_code=401, detail="Invalid MPIN")


@router.get("/mpin/status")
async def mpin_status(request: Request):
    """Check if MPIN is enabled for user"""
    user = await _get_user(request)
    db = get_db()
    record = await db.user_mpin.find_one({"user_id": user.user_id})
    return {"is_enabled": bool(record and record.get("is_enabled", False))}


@router.post("/mpin/disable")
async def disable_mpin(request: Request):
    """Disable MPIN"""
    user = await _get_user(request)
    db = get_db()
    await db.user_mpin.update_one(
        {"user_id": user.user_id},
        {"$set": {"is_enabled": False, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "MPIN disabled", "is_enabled": False}
