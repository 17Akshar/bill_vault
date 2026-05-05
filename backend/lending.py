"""
Lending Module
==============

Extracted from server.py monolith during modularisation (Session 14).

Endpoints:
  POST   /api/lending                    Create lending record (lent or borrowed)
  GET    /api/lending                    List records (filter by type / settled)
  PUT    /api/lending/{lending_id}       Update record
  DELETE /api/lending/{lending_id}       Hard-delete record
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from firebase_config import db

lending_router = APIRouter(prefix="/api", tags=["lending"])


class LendingCreate(BaseModel):
    lending_type: str  # 'lent' | 'borrowed'
    person_name: str
    amount: float
    date: str
    due_date: Optional[str] = None
    notes: Optional[str] = None


class LendingUpdate(BaseModel):
    remaining_amount: Optional[float] = None
    due_date: Optional[str] = None
    notes: Optional[str] = None
    is_settled: Optional[bool] = None


async def _get_user(request: Request):
    from server import get_current_user
    return await get_current_user(request)


@lending_router.post("/lending")
async def create_lending(data: LendingCreate, request: Request):
    user = await _get_user(request)
    lending_id = f"lend_{uuid.uuid4().hex[:12]}"
    lending = {
        "lending_id": lending_id, "user_id": user.user_id,
        "lending_type": data.lending_type, "person_name": data.person_name,
        "amount": data.amount, "remaining_amount": data.amount,
        "date": datetime.fromisoformat(data.date.replace("Z", "+00:00")),
        "due_date": (
            datetime.fromisoformat(data.due_date.replace("Z", "+00:00"))
            if data.due_date else None
        ),
        "notes": data.notes, "is_settled": False,
        "created_at": datetime.now(timezone.utc),
    }
    await db.lending.insert_one(lending)
    lending.pop("_id", None)
    return lending


@lending_router.get("/lending")
async def get_lending(
    request: Request,
    lending_type: Optional[str] = None,
    is_settled: Optional[bool] = None,
):
    user = await _get_user(request)
    query: Dict = {"user_id": user.user_id}
    if lending_type:
        query["lending_type"] = lending_type
    if is_settled is not None:
        query["is_settled"] = is_settled
    return await db.lending.find(query, {"_id": 0}).sort("date", -1).to_list(1000)


@lending_router.put("/lending/{lending_id}")
async def update_lending(lending_id: str, data: LendingUpdate, request: Request):
    user = await _get_user(request)
    existing = await db.lending.find_one(
        {"lending_id": lending_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Lending record not found")
    update_data = {
        k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None
    }
    if "due_date" in update_data and isinstance(update_data["due_date"], str):
        update_data["due_date"] = datetime.fromisoformat(
            update_data["due_date"].replace("Z", "+00:00")
        )
    await db.lending.update_one({"lending_id": lending_id}, {"$set": update_data})
    return await db.lending.find_one({"lending_id": lending_id}, {"_id": 0})


@lending_router.delete("/lending/{lending_id}")
async def delete_lending(lending_id: str, request: Request):
    user = await _get_user(request)
    result = await db.lending.delete_one(
        {"lending_id": lending_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lending record not found")
    return {"message": "Lending record deleted"}
