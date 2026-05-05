"""
Uploads Module
==============

Handles attachment uploads for transactions (income/expense/transfer).
Tries Firebase Storage first, falls back to local disk if the Storage
bucket isn't provisioned. Either way the caller stores the returned
`attachment_url` on the transaction document.

Endpoints:
  POST  /api/uploads/attachment        Upload an image, returns its URL
  GET   /api/uploads/files/{path}      Serve a locally-stored file (fallback)
  GET   /api/labels                    Distinct labels previously used by the user
"""
import os
import uuid
import logging
from pathlib import Path
from typing import Set
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from fastapi.responses import FileResponse

from firebase_config import db, get_storage_bucket

logger = logging.getLogger(__name__)
uploads_router = APIRouter(prefix="/api", tags=["uploads"])

# 10 MB cap — receipts/photos shouldn't exceed this
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic", "image/heif",
}

# Local-disk fallback location (used when Firebase Storage bucket missing)
LOCAL_UPLOAD_DIR = Path("/app/backend/uploads_data")
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def _get_user(request: Request):
    # Lazy import to avoid circular import with server.py
    from server import get_current_user
    return await get_current_user(request)


def _try_firebase_upload(blob_path: str, raw: bytes, content_type: str) -> str | None:
    """Returns the public URL on success, or None on any failure (caller falls back)."""
    try:
        bucket = get_storage_bucket()
        blob = bucket.blob(blob_path)
        blob.upload_from_string(raw, content_type=content_type)
        blob.make_public()
        return blob.public_url
    except Exception as e:
        logger.warning(f"Firebase Storage unavailable, using local fallback: {e}")
        return None


def _save_local(blob_path: str, raw: bytes) -> str:
    """Save bytes to local disk and return a backend-served URL path."""
    target = LOCAL_UPLOAD_DIR / blob_path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    # Return a relative API path; the frontend will prefix with the backend URL
    return f"/api/uploads/files/{blob_path}"


@uploads_router.post("/uploads/attachment")
async def upload_attachment(request: Request, file: UploadFile = File(...)):
    """
    Upload an image. Tries Firebase Storage first, falls back to local disk.
    Returns the URL to store in `attachment_url`.
    """
    user = await _get_user(request)

    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{content_type}'. Allowed: {sorted(ALLOWED_CONTENT_TYPES)}",
        )

    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max {MAX_UPLOAD_BYTES // (1024 * 1024)}MB",
        )

    safe_name = (file.filename or "upload").replace("/", "_").replace("\\", "_")
    blob_path = f"attachments/{user.user_id}/{uuid.uuid4().hex}_{safe_name}"

    url = _try_firebase_upload(blob_path, raw, content_type)
    storage = "firebase"
    if not url:
        url = _save_local(blob_path, raw)
        storage = "local"

    return {
        "attachment_url": url,
        "path": blob_path,
        "size": len(raw),
        "content_type": content_type,
        "storage": storage,
    }


@uploads_router.get("/uploads/files/{full_path:path}")
async def serve_local_file(full_path: str):
    """Serve a locally-stored attachment (fallback storage)."""
    # Prevent directory traversal
    safe = LOCAL_UPLOAD_DIR / full_path
    try:
        safe = safe.resolve()
        if LOCAL_UPLOAD_DIR.resolve() not in safe.parents and safe != LOCAL_UPLOAD_DIR.resolve():
            raise HTTPException(status_code=400, detail="Invalid path")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path")
    if not safe.exists() or not safe.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(safe)


@uploads_router.get("/labels")
async def get_user_labels(request: Request):
    """Distinct labels previously used by this user (for chip suggestions)."""
    user = await _get_user(request)

    seen: Set[str] = set()
    for collection in ("income", "expenses", "transfers"):
        try:
            docs = await getattr(db, collection).find(
                {"user_id": user.user_id}, {"_id": 0, "labels": 1}
            ).to_list(2000)
        except Exception:
            docs = []
        for d in docs:
            for lab in (d.get("labels") or []):
                if isinstance(lab, str) and lab.strip():
                    seen.add(lab.strip())

    return {"labels": sorted(seen, key=lambda s: s.lower())}
