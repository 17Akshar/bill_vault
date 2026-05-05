"""
Uploads Module
==============

Handles attachment uploads to Firebase Storage. Used by transactions
(income/expense/transfer) for receipt/photo attachments.

Endpoints:
  POST  /api/uploads/attachment   Upload an image, returns its public URL
  GET   /api/labels               Distinct labels previously used by the user

Storage path:  attachments/<user_id>/<uuid>_<filename>
"""
import os
import uuid
import logging
import datetime
from typing import Optional, Set
from fastapi import APIRouter, HTTPException, Request, UploadFile, File

from firebase_config import db, get_storage_bucket

logger = logging.getLogger(__name__)
uploads_router = APIRouter(prefix="/api", tags=["uploads"])

# 10 MB cap — receipts/photos shouldn't exceed this
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif",
}


async def _get_user(request: Request):
    # Lazy import to avoid circular import with server.py
    from server import get_current_user
    return await get_current_user(request)


@uploads_router.post("/uploads/attachment")
async def upload_attachment(request: Request, file: UploadFile = File(...)):
    """
    Upload an image to Firebase Storage.
    Returns a publicly accessible URL that callers can store in
    `attachment_url` on income/expense/transfer documents.
    """
    user = await _get_user(request)

    # Validate content type
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Allowed: {sorted(ALLOWED_CONTENT_TYPES)}",
        )

    # Read & validate size
    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max {MAX_UPLOAD_BYTES // (1024 * 1024)}MB",
        )

    # Build Firebase Storage path
    safe_name = (file.filename or "upload").replace("/", "_").replace("\\", "_")
    blob_path = f"attachments/{user.user_id}/{uuid.uuid4().hex}_{safe_name}"

    try:
        bucket = get_storage_bucket()
        blob = bucket.blob(blob_path)
        blob.upload_from_string(raw, content_type=content_type)
        # Make the object publicly readable. Storage rules MAY further
        # restrict, but for attachments we want a stable URL the client
        # can render directly without re-signing on every read.
        blob.make_public()
        public_url = blob.public_url
    except Exception as e:
        logger.exception("Firebase Storage upload failed")
        raise HTTPException(status_code=502, detail=f"Storage upload failed: {e}")

    return {
        "attachment_url": public_url,
        "path": blob_path,
        "size": len(raw),
        "content_type": content_type,
    }


@uploads_router.get("/labels")
async def get_user_labels(request: Request):
    """
    Returns distinct labels previously used by the user across
    income, expenses, and transfers — for the "saved labels" picker.
    """
    user = await _get_user(request)

    seen: Set[str] = set()
    for collection in ("income", "expenses", "transfers"):
        try:
            docs = await db[collection].find(
                {"user_id": user.user_id}, {"_id": 0, "labels": 1}
            ).to_list(2000)
        except Exception:
            docs = []
        for d in docs:
            for lab in (d.get("labels") or []):
                if isinstance(lab, str) and lab.strip():
                    seen.add(lab.strip())

    return {"labels": sorted(seen, key=lambda s: s.lower())}
