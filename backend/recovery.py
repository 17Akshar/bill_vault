"""
Account Recovery Module
=======================

Secure recovery flows powered by Firebase Auth + Firestore.

Endpoints:
  POST /api/recovery/password/email         - Send email password-reset (rate-limited)
  POST /api/recovery/password/phone/verify  - Verify Phone ID token + reset password
  POST /api/recovery/email/reveal           - After Phone OTP, return masked email(s)
  GET  /api/recovery/status                 - Check block status for identifier

All phone OTP delivery + verification happens CLIENT-SIDE via Firebase Web SDK
(RecaptchaVerifier + signInWithPhoneNumber). The client forwards the resulting
Firebase ID token to backend endpoints which verify it via firebase-admin.

Rate limiting:
  Firestore collection `recovery_attempts` keyed by sha256(identifier).
  Max 5 attempts / 15-min rolling window -> block for 30 min.

Audit logging:
  Firestore collection `recovery_logs` (append-only).

Security notes:
  - User-enumeration prevention: email-password-reset always returns the
    same message regardless of whether the account exists.
  - Masked email reveal requires a phone-verified Firebase ID token
    (auth.verify_id_token validates signature + expiry).
  - Password strength enforced server-side AND client-side: min 8 chars,
    at least 1 uppercase letter and 1 digit.
"""
import hashlib
import logging
import re
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
try:
    from firebase_admin import auth as firebase_auth
    _FIREBASE_AUTH_AVAILABLE = True
except ImportError:
    firebase_auth = None
    _FIREBASE_AUTH_AVAILABLE = False

from firebase_config import db

logger = logging.getLogger(__name__)

recovery_router = APIRouter(prefix="/api/recovery", tags=["recovery"])

# ==================== CONFIG ====================
MAX_ATTEMPTS = 5
WINDOW_MINUTES = 15
BLOCK_MINUTES = 30
PASSWORD_REGEX = re.compile(r"^(?=.*[A-Z])(?=.*\d).{8,}$")
PHONE_REGEX = re.compile(r"^\+[1-9]\d{7,14}$")  # E.164


# ==================== MODELS ====================
class EmailRecoveryRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)


class PhonePasswordResetRequest(BaseModel):
    firebase_id_token: str = Field(..., min_length=20)
    new_password: str = Field(..., min_length=8, max_length=128)


class EmailRevealRequest(BaseModel):
    firebase_id_token: str = Field(..., min_length=20)


class StatusRequest(BaseModel):
    identifier: str


# ==================== HELPERS ====================
def _hash_identifier(identifier: str) -> str:
    return hashlib.sha256(identifier.lower().strip().encode("utf-8")).hexdigest()


def _mask_email(email: str) -> str:
    """j***@gmail.com style masking."""
    if not email or "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        masked_local = local + "***"
    elif len(local) <= 3:
        masked_local = local[0] + "***"
    else:
        masked_local = local[0] + "***" + local[-1]
    return f"{masked_local}@{domain}"


def _validate_password_strength(password: str) -> Optional[str]:
    """Returns error message if weak, else None."""
    if len(password) < 8:
        return "Password must be at least 8 characters"
    if len(password) > 128:
        return "Password too long (max 128 characters)"
    if not PASSWORD_REGEX.match(password):
        return "Password must contain at least one uppercase letter and one number"
    return None


def _client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def _log_attempt(
    attempt_type: str,
    identifier: str,
    ip: str,
    success: bool,
    reason: Optional[str] = None,
):
    try:
        await db.recovery_logs.insert_one({
            "log_id": f"rlog_{uuid.uuid4().hex[:16]}",
            "type": attempt_type,
            "identifier_hash": _hash_identifier(identifier),
            "identifier_preview": (identifier[:1] + "***") if identifier else "***",
            "ip": ip,
            "success": success,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc),
        })
    except Exception as e:
        logger.warning(f"Failed to write recovery log: {e}")


async def _check_and_increment_rate_limit(identifier: str) -> dict:
    """
    Returns {'allowed': bool, 'remaining': int, 'blocked_until': iso or None, 'reason': str}
    Increments attempt counter on every call regardless of outcome (defense in depth).
    """
    key = _hash_identifier(identifier)
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(minutes=WINDOW_MINUTES)

    doc = await db.recovery_attempts.find_one({"attempt_id": key})

    if doc:
        blocked_until_raw = doc.get("blocked_until")
        if blocked_until_raw:
            blocked_until = blocked_until_raw
            if isinstance(blocked_until, str):
                blocked_until = datetime.fromisoformat(blocked_until.replace("Z", "+00:00"))
            if blocked_until.tzinfo is None:
                blocked_until = blocked_until.replace(tzinfo=timezone.utc)
            if blocked_until > now:
                return {
                    "allowed": False,
                    "remaining": 0,
                    "blocked_until": blocked_until.isoformat(),
                    "reason": "Too many attempts. Try again later.",
                }

        # Check window
        first_raw = doc.get("window_start")
        first = first_raw
        if isinstance(first, str):
            first = datetime.fromisoformat(first.replace("Z", "+00:00"))
        if first and first.tzinfo is None:
            first = first.replace(tzinfo=timezone.utc)

        if first and first < window_start:
            # Window expired, reset
            count = 1
            new_window = now
        else:
            count = (doc.get("count") or 0) + 1
            new_window = first or now

        block_until = None
        if count > MAX_ATTEMPTS:
            block_until = now + timedelta(minutes=BLOCK_MINUTES)

        await db.recovery_attempts.update_one(
            {"attempt_id": key},
            {"$set": {
                "attempt_id": key,
                "count": count,
                "window_start": new_window,
                "last_attempt_at": now,
                "blocked_until": block_until,
            }},
            upsert=True,
        )

        if block_until:
            return {
                "allowed": False,
                "remaining": 0,
                "blocked_until": block_until.isoformat(),
                "reason": "Too many attempts. Blocked for 30 minutes.",
            }
        return {
            "allowed": True,
            "remaining": max(0, MAX_ATTEMPTS - count),
            "blocked_until": None,
            "reason": "",
        }

    # First attempt
    await db.recovery_attempts.update_one(
        {"attempt_id": key},
        {"$set": {
            "attempt_id": key,
            "count": 1,
            "window_start": now,
            "last_attempt_at": now,
            "blocked_until": None,
        }},
        upsert=True,
    )
    return {"allowed": True, "remaining": MAX_ATTEMPTS - 1, "blocked_until": None, "reason": ""}


async def _reset_rate_limit(identifier: str):
    """Clear counter after a successful recovery."""
    key = _hash_identifier(identifier)
    try:
        await db.recovery_attempts.update_one(
            {"attempt_id": key},
            {"$set": {"attempt_id": key, "count": 0, "blocked_until": None,
                      "window_start": datetime.now(timezone.utc),
                      "last_attempt_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    except Exception as e:
        logger.warning(f"Failed to reset rate limit: {e}")


def _verify_phone_id_token(id_token: str) -> str:
    """
    Verify a Firebase ID token from Phone Auth. Returns the E.164 phone_number claim.
    Raises HTTPException on invalid token or missing phone.
    """
    if not _FIREBASE_AUTH_AVAILABLE or firebase_auth is None:
        raise HTTPException(status_code=503, detail="Phone verification not available in local mode")
    try:
        decoded = firebase_auth.verify_id_token(id_token, check_revoked=False)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired verification token")

    phone = decoded.get("phone_number")
    if not phone:
        # Token might be email-based - reject for phone-required flows
        # But also check firebase.sign_in_provider
        provider = (decoded.get("firebase") or {}).get("sign_in_provider")
        if provider != "phone":
            raise HTTPException(status_code=401,
                                detail="This endpoint requires a phone-verified token")
        raise HTTPException(status_code=401, detail="Phone number missing from token")

    return phone


# ==================== ENDPOINTS ====================
@recovery_router.post("/status")
async def recovery_status(data: StatusRequest):
    """Check rate-limit status for an identifier (email or phone)."""
    key = _hash_identifier(data.identifier)
    doc = await db.recovery_attempts.find_one({"attempt_id": key})
    if not doc:
        return {"blocked": False, "remaining": MAX_ATTEMPTS, "blocked_until": None}

    now = datetime.now(timezone.utc)
    blocked_until = doc.get("blocked_until")
    if isinstance(blocked_until, str):
        try:
            blocked_until = datetime.fromisoformat(blocked_until.replace("Z", "+00:00"))
        except ValueError:
            blocked_until = None
    if blocked_until and blocked_until.tzinfo is None:
        blocked_until = blocked_until.replace(tzinfo=timezone.utc)

    is_blocked = blocked_until is not None and blocked_until > now
    return {
        "blocked": is_blocked,
        "remaining": max(0, MAX_ATTEMPTS - (doc.get("count") or 0)),
        "blocked_until": blocked_until.isoformat() if blocked_until else None,
    }


@recovery_router.post("/password/email")
async def request_password_reset_email(data: EmailRecoveryRequest, request: Request):
    """
    Rate-limited email password-reset.
    Always returns success (prevents user enumeration).
    Frontend is expected to ALSO invoke Firebase Web SDK sendPasswordResetEmail(email)
    so that Firebase delivers the reset link. This endpoint enforces server-side
    rate limiting and logs attempts.
    """
    email = data.email.strip().lower()
    ip = _client_ip(request)

    rate = await _check_and_increment_rate_limit(email)
    if not rate["allowed"]:
        await _log_attempt("password_email", email, ip, False, rate["reason"])
        raise HTTPException(status_code=429, detail=rate["reason"])

    # Check existence only for logging; NEVER reveal to client
    user_doc = await db.users.find_one({"email": email})
    exists = user_doc is not None
    await _log_attempt("password_email", email, ip, exists,
                       None if exists else "no_such_user")

    return {
        "message": "If an account exists with that email, a reset link has been sent.",
        "remaining_attempts": rate["remaining"],
    }


@recovery_router.post("/password/phone/verify")
async def reset_password_with_phone(data: PhonePasswordResetRequest, request: Request):
    """
    After the client verifies Phone OTP via Firebase Web SDK,
    it sends the resulting ID token here along with the new password.
    Backend verifies token, finds the user by phone, updates password.
    """
    ip = _client_ip(request)

    # Validate password strength first (fail fast)
    pw_err = _validate_password_strength(data.new_password)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    # Verify Firebase ID token
    phone = _verify_phone_id_token(data.firebase_id_token)

    # Rate-limit on phone
    rate = await _check_and_increment_rate_limit(phone)
    if not rate["allowed"]:
        await _log_attempt("password_phone", phone, ip, False, rate["reason"])
        raise HTTPException(status_code=429, detail=rate["reason"])

    # Find user by mobile_number
    user_doc = await db.users.find_one({"mobile_number": phone})
    if not user_doc:
        # Also try without leading '+'
        user_doc = await db.users.find_one({"mobile_number": phone.lstrip("+")})
    if not user_doc:
        await _log_attempt("password_phone", phone, ip, False, "no_user_for_phone")
        # No-enumeration: return generic 401 matching invalid-token response
        raise HTTPException(status_code=401,
                            detail="Verification failed. Please try again or create a new account.")

    # Hash and update
    hashed = bcrypt.hashpw(data.new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    await db.users.update_one(
        {"user_id": user_doc["user_id"]},
        {"$set": {"password_hash": hashed,
                  "password_changed_at": datetime.now(timezone.utc)}},
    )

    # Sync to Firebase Auth if user has a firebase_uid
    fb_uid = user_doc.get("firebase_uid")
    if fb_uid and _FIREBASE_AUTH_AVAILABLE and firebase_auth is not None:
        try:
            firebase_auth.update_user(fb_uid, password=data.new_password)
        except Exception as e:
            logger.warning(f"Failed to sync password to Firebase Auth for {fb_uid}: {e}")

    await _reset_rate_limit(phone)
    await _log_attempt("password_phone", phone, ip, True)
    return {"message": "Password reset successfully. Please sign in with your new password."}


@recovery_router.post("/email/reveal")
async def reveal_email_by_phone(data: EmailRevealRequest, request: Request):
    """
    Forgot-email flow.
    Client verifies Phone OTP -> sends ID token. Backend returns masked emails
    of all accounts associated with the verified phone number.
    """
    ip = _client_ip(request)
    phone = _verify_phone_id_token(data.firebase_id_token)

    rate = await _check_and_increment_rate_limit(phone)
    if not rate["allowed"]:
        await _log_attempt("email_reveal", phone, ip, False, rate["reason"])
        raise HTTPException(status_code=429, detail=rate["reason"])

    # Lookup all accounts for this phone
    users_cur = db.users.find({"mobile_number": phone})
    users = await users_cur.to_list(100)

    if not users:
        alt_cur = db.users.find({"mobile_number": phone.lstrip("+")})
        users = await alt_cur.to_list(100)

    if not users:
        await _log_attempt("email_reveal", phone, ip, False, "no_user_for_phone")
        # Return empty list rather than 404 — prevents phone enumeration
        return {"accounts": [], "count": 0,
                "message": "No accounts found for this phone number."}

    accounts = []
    for u in users:
        email = u.get("email") or ""
        if email and email != "single-user@local":
            accounts.append({
                "masked_email": _mask_email(email),
                "name_preview": (u.get("name") or "")[:2] + "***"
                    if u.get("name") else None,
                "created_at": u.get("created_at").isoformat()
                    if isinstance(u.get("created_at"), datetime) else u.get("created_at"),
            })

    await _reset_rate_limit(phone)
    await _log_attempt("email_reveal", phone, ip, True)
    return {
        "accounts": accounts,
        "count": len(accounts),
        "message": f"Found {len(accounts)} account(s) for your phone.",
    }
