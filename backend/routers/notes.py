"""Notes CRUD Router"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/api", tags=["notes"])

# Import db from main server
def get_db():
    from routers.deps import db
    return db

# Models
class NoteCreate(BaseModel):
    title: str
    content: str = ""
    sections: Optional[list] = None
    tags: Optional[list] = None
    linked_type: Optional[str] = None
    linked_id: Optional[str] = None
    priority: str = "normal"
    color: Optional[str] = None

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    sections: Optional[list] = None
    tags: Optional[list] = None
    linked_type: Optional[str] = None
    linked_id: Optional[str] = None
    priority: Optional[str] = None
    color: Optional[str] = None
    is_archived: Optional[bool] = None


async def _get_user(request: Request):
    """Get current user from the main server's auth"""
    from server import get_current_user
    return await get_current_user(request)


@router.post("/notes")
async def create_note(data: NoteCreate, request: Request):
    user = await _get_user(request)
    db = get_db()
    note_id = f"note_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    note = {
        "note_id": note_id, "user_id": user.user_id,
        "title": data.title, "content": data.content,
        "sections": data.sections or [],
        "tags": data.tags or [],
        "linked_type": data.linked_type, "linked_id": data.linked_id,
        "priority": data.priority or "normal",
        "color": data.color,
        "is_archived": False,
        "created_at": now, "updated_at": now,
    }
    await db.notes.insert_one(note)
    note.pop("_id", None)
    return note


@router.get("/notes")
async def get_notes(request: Request, tag: Optional[str] = None, linked_type: Optional[str] = None, is_archived: bool = False):
    user = await _get_user(request)
    db = get_db()
    query = {"user_id": user.user_id, "is_archived": is_archived}
    if tag:
        query["tags"] = tag
    if linked_type:
        query["linked_type"] = linked_type
    notes = await db.notes.find(query, {"_id": 0}).sort("updated_at", -1).to_list(200)
    return notes


@router.get("/notes/{note_id}")
async def get_note(note_id: str, request: Request):
    user = await _get_user(request)
    db = get_db()
    note = await db.notes.find_one({"note_id": note_id, "user_id": user.user_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/notes/{note_id}")
async def update_note(note_id: str, data: NoteUpdate, request: Request):
    user = await _get_user(request)
    db = get_db()
    existing = await db.notes.find_one({"note_id": note_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")
    update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.notes.update_one({"note_id": note_id}, {"$set": update_data})
    updated = await db.notes.find_one({"note_id": note_id}, {"_id": 0})
    return updated


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str, request: Request):
    user = await _get_user(request)
    db = get_db()
    existing = await db.notes.find_one({"note_id": note_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.notes.delete_one({"note_id": note_id})
    return {"message": "Note deleted"}
