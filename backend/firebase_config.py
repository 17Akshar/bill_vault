"""
Firebase Configuration & Firestore Database Wrapper
Provides MongoDB-compatible interface over Firestore for minimal migration effort.
"""
import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth, firestore
from google.cloud.firestore_v1 import FieldFilter

load_dotenv()

# ==================== FIREBASE INITIALIZATION ====================

def _get_firebase_credentials():
    """Build credentials from env vars"""
    project_id = os.getenv("FIREBASE_PROJECT_ID")
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL")
    private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n")

    if not all([project_id, client_email, private_key]):
        raise ValueError(
            "Missing Firebase credentials. Set FIREBASE_PROJECT_ID, "
            "FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env"
        )

    cred_dict = {
        "type": "service_account",
        "project_id": project_id,
        "private_key_id": "firebase-key",
        "private_key": private_key,
        "client_email": client_email,
        "client_id": "",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email}",
    }
    return credentials.Certificate(cred_dict)


def init_firebase():
    """Initialize Firebase Admin SDK"""
    if not firebase_admin._apps:
        cred = _get_firebase_credentials()
        firebase_admin.initialize_app(cred)
    return firestore.client()


# Global Firestore client
_firestore_client = None

def get_firestore_client():
    global _firestore_client
    if _firestore_client is None:
        _firestore_client = init_firebase()
    return _firestore_client


# ==================== FIREBASE AUTH HELPERS ====================

def verify_firebase_token(id_token: str) -> dict:
    """Verify a Firebase ID token and return decoded claims"""
    try:
        decoded = firebase_auth.verify_id_token(id_token)
        return decoded
    except Exception as e:
        raise ValueError(f"Invalid Firebase token: {str(e)}")


def create_firebase_user(email: str, password: str, display_name: str = None) -> str:
    """Create a user in Firebase Auth, returns uid"""
    kwargs = {"email": email, "password": password}
    if display_name:
        kwargs["display_name"] = display_name
    user = firebase_auth.create_user(**kwargs)
    return user.uid


def delete_firebase_user(uid: str):
    """Delete a user from Firebase Auth"""
    firebase_auth.delete_user(uid)


# ==================== FIRESTORE MONGODB-COMPATIBLE WRAPPER ====================

def _split_filters(filters: List[Dict]):
    """Split filters into (firestore_filter, client_side_filters).

    To completely side-step Firestore composite-index requirements, we push ONLY
    a single equality filter to Firestore (preferring `user_id`) and evaluate all
    other filters client-side in Python. This is acceptable for per-user personal-
    finance data where each user's record count is bounded.
    """
    if not filters:
        return None, []
    # Prefer user_id equality
    primary = None
    rest = []
    for f in filters:
        if primary is None and f["op"] == "==" and f["field"] == "user_id":
            primary = f
        else:
            rest.append(f)
    # If no user_id, use the first equality filter
    if primary is None:
        for i, f in enumerate(rest):
            if f["op"] == "==":
                primary = f
                rest = rest[:i] + rest[i+1:]
                break
    return primary, rest


def _matches_filters(doc: Dict, filters: List[Dict]) -> bool:
    """Evaluate a list of MongoDB-style filters against a document client-side."""
    for f in filters:
        field = f["field"]
        op = f["op"]
        target = f["value"]
        actual = doc.get(field)
        # Normalize datetime comparisons (target might be datetime, actual might be ISO string)
        if isinstance(target, datetime) and isinstance(actual, str):
            try:
                actual = datetime.fromisoformat(actual.replace("Z", "+00:00"))
            except ValueError:
                pass
        try:
            if op == "==":
                if actual != target:
                    return False
            elif op == "!=":
                if actual == target:
                    return False
            elif op == ">":
                if actual is None or not (actual > target):
                    return False
            elif op == ">=":
                if actual is None or not (actual >= target):
                    return False
            elif op == "<":
                if actual is None or not (actual < target):
                    return False
            elif op == "<=":
                if actual is None or not (actual <= target):
                    return False
            elif op == "in":
                if actual not in (target or []):
                    return False
        except TypeError:
            return False
    return True


def _doc_to_dict(doc) -> Optional[Dict]:
    d = doc.to_dict()
    if d is None:
        return None
    for k, v in list(d.items()):
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


class _Result:
    """MongoDB-compatible result object for write operations."""
    def __init__(self, matched_count: int = 0, modified_count: int = 0,
                 deleted_count: int = 0, inserted_id: str = None,
                 upserted_id: str = None, acknowledged: bool = True):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.deleted_count = deleted_count
        self.inserted_id = inserted_id
        self.upserted_id = upserted_id
        self.acknowledged = acknowledged


class FirestoreQuery:
    """Mimics MongoDB cursor with chaining"""

    def __init__(self, collection_ref, filters=None, projection=None):
        self._ref = collection_ref
        self._filters = filters or []
        self._projection = projection
        self._sort_field = None
        self._sort_dir = None
        self._limit_val = None

    def sort(self, field: str, direction: int):
        """direction: 1 = asc, -1 = desc"""
        self._sort_field = field
        self._sort_dir = firestore.Query.ASCENDING if direction == 1 else firestore.Query.DESCENDING
        return self

    def limit(self, n: int):
        self._limit_val = n
        return self

    async def to_list(self, max_count: int = 1000) -> List[Dict]:
        """Execute query, with client-side filter+sort+limit to avoid composite indexes."""
        def _execute():
            primary, rest = _split_filters(self._filters)
            query = self._ref
            if primary is not None:
                query = query.where(filter=FieldFilter(primary["field"], primary["op"], primary["value"]))
            docs = query.stream()
            results = []
            for doc in docs:
                d = _doc_to_dict(doc)
                if d is None:
                    continue
                if not _matches_filters(d, rest):
                    continue
                if self._projection and "_id" in self._projection and self._projection["_id"] == 0:
                    d.pop("_id", None)
                results.append(d)

            # Client-side sort
            if self._sort_field:
                reverse = self._sort_dir == firestore.Query.DESCENDING
                try:
                    results.sort(
                        key=lambda x: x.get(self._sort_field) if x.get(self._sort_field) is not None else "",
                        reverse=reverse,
                    )
                except TypeError:
                    results.sort(key=lambda x: str(x.get(self._sort_field) or ""), reverse=reverse)

            # Client-side limit
            limit = self._limit_val or max_count
            return results[:limit]
        return await asyncio.to_thread(_execute)


class FirestoreCollection:
    """Mimics MongoDB collection interface"""

    def __init__(self, name: str):
        self._name = name

    @property
    def _col(self):
        return get_firestore_client().collection(self._name)

    def find(self, query: Dict = None, projection: Dict = None) -> FirestoreQuery:
        """Build a query - returns chainable FirestoreQuery"""
        filters = _mongo_query_to_firestore(query or {})
        return FirestoreQuery(self._col, filters, projection)

    async def find_one(self, query: Dict, projection: Dict = None) -> Optional[Dict]:
        """Find a single document matching query"""
        def _execute():
            filters = _mongo_query_to_firestore(query)
            primary, rest = _split_filters(filters)
            q = self._col
            if primary is not None:
                q = q.where(filter=FieldFilter(primary["field"], primary["op"], primary["value"]))
            for doc in q.stream():
                d = _doc_to_dict(doc)
                if d is None:
                    continue
                if not _matches_filters(d, rest):
                    continue
                if projection and "_id" in projection and projection["_id"] == 0:
                    d.pop("_id", None)
                return d
            return None
        return await asyncio.to_thread(_execute)

    async def insert_one(self, document: Dict):
        """Insert a document"""
        def _execute():
            doc = _serialize_doc(document)
            # Resolve doc_id. Prefer per-record unique IDs (income_id, expense_id, etc.)
            # over `user_id` which is SHARED across many records for a single user —
            # using user_id as doc_id would cause inserts to silently overwrite each other.
            doc_id = None
            for key in ["income_id", "expense_id", "bill_id", "investment_id",
                        "heading_id", "reminder_id", "note_id", "family_member_id",
                        "card_id", "loan_id", "lending_id", "rental_id",
                        "payment_id", "account_id", "attempt_id", "log_id",
                        "snapshot_id",
                        "user_id"]:
                if key in doc:
                    doc_id = doc[key]
                    break
            # Collections that legitimately use user_id as the primary key
            # (one document per user). For all other collections, if only
            # user_id is present, Firestore will auto-generate a document ID.
            SINGLE_USER_DOC_COLLECTIONS = {
                "users", "user_settings", "user_mpin",
            }
            if doc_id and doc_id == doc.get("user_id") \
               and self._name not in SINGLE_USER_DOC_COLLECTIONS:
                doc_id = None
            if doc_id:
                self._col.document(doc_id).set(doc)
            else:
                _, ref = self._col.add(doc)
                doc_id = ref.id if ref else None
            return _Result(inserted_id=doc_id, acknowledged=True)
        return await asyncio.to_thread(_execute)

    async def update_one(self, query: Dict, update: Dict, upsert: bool = False):
        """Update a single document"""
        def _execute():
            filters = _mongo_query_to_firestore(query)
            primary, rest = _split_filters(filters)
            q = self._col
            if primary is not None:
                q = q.where(filter=FieldFilter(primary["field"], primary["op"], primary["value"]))
            target_doc = None
            for doc in q.stream():
                d = _doc_to_dict(doc)
                if d is None:
                    continue
                if _matches_filters(d, rest):
                    target_doc = doc
                    break

            update_data = {}
            has_operator = "$set" in update or "$inc" in update
            if "$set" in update:
                update_data.update(_serialize_doc(update["$set"]))
            if "$inc" in update:
                if target_doc:
                    existing = target_doc.to_dict() or {}
                    for k, v in update["$inc"].items():
                        update_data[k] = existing.get(k, 0) + v
                elif upsert:
                    for k, v in update["$inc"].items():
                        update_data[k] = v
            if not has_operator:
                update_data = _serialize_doc(update)

            if target_doc:
                target_doc.reference.update(update_data)
                return _Result(matched_count=1, modified_count=1)
            elif upsert:
                merged = {}
                for f in filters:
                    if f["op"] == "==":
                        merged[f["field"]] = f["value"]
                merged.update(update_data)
                doc_id = None
                for key in ["user_id", "account_id", "note_id"]:
                    if key in merged:
                        doc_id = merged[key]
                        break
                if doc_id:
                    self._col.document(doc_id).set(merged)
                else:
                    _, ref = self._col.add(merged)
                    doc_id = ref.id if ref else None
                return _Result(matched_count=0, modified_count=0, upserted_id=doc_id)
            return _Result(matched_count=0, modified_count=0)
        return await asyncio.to_thread(_execute)

    async def update_many(self, query: Dict, update: Dict):
        """Update all matching documents"""
        def _execute():
            filters = _mongo_query_to_firestore(query)
            primary, rest = _split_filters(filters)
            q = self._col
            if primary is not None:
                q = q.where(filter=FieldFilter(primary["field"], primary["op"], primary["value"]))
            matches = []
            for doc in q.stream():
                d = _doc_to_dict(doc)
                if d is None:
                    continue
                if _matches_filters(d, rest):
                    matches.append(doc)

            update_data = {}
            if "$set" in update:
                update_data = _serialize_doc(update["$set"])
            else:
                update_data = _serialize_doc(update)

            batch = get_firestore_client().batch()
            for doc in matches:
                batch.update(doc.reference, update_data)
            batch.commit()
            return _Result(matched_count=len(matches), modified_count=len(matches))
        return await asyncio.to_thread(_execute)

    async def delete_one(self, query: Dict):
        """Delete a single document"""
        def _execute():
            filters = _mongo_query_to_firestore(query)
            primary, rest = _split_filters(filters)
            q = self._col
            if primary is not None:
                q = q.where(filter=FieldFilter(primary["field"], primary["op"], primary["value"]))
            for doc in q.stream():
                d = _doc_to_dict(doc)
                if d is None:
                    continue
                if _matches_filters(d, rest):
                    doc.reference.delete()
                    return _Result(deleted_count=1)
            return _Result(deleted_count=0)
        return await asyncio.to_thread(_execute)

    async def delete_many(self, query: Dict):
        """Delete all matching documents"""
        def _execute():
            filters = _mongo_query_to_firestore(query)
            primary, rest = _split_filters(filters)
            q = self._col
            if primary is not None:
                q = q.where(filter=FieldFilter(primary["field"], primary["op"], primary["value"]))
            matches = []
            for doc in q.stream():
                d = _doc_to_dict(doc)
                if d is None:
                    continue
                if _matches_filters(d, rest):
                    matches.append(doc)
            batch = get_firestore_client().batch()
            for doc in matches:
                batch.delete(doc.reference)
            batch.commit()
            return _Result(deleted_count=len(matches))
        return await asyncio.to_thread(_execute)

    async def count_documents(self, query: Dict) -> int:
        """Count matching documents"""
        def _execute():
            filters = _mongo_query_to_firestore(query)
            primary, rest = _split_filters(filters)
            q = self._col
            if primary is not None:
                q = q.where(filter=FieldFilter(primary["field"], primary["op"], primary["value"]))
            count = 0
            for doc in q.stream():
                d = _doc_to_dict(doc)
                if d is None:
                    continue
                if _matches_filters(d, rest):
                    count += 1
            return count
        return await asyncio.to_thread(_execute)


class FirestoreDB:
    """Top-level database object - access collections as attributes"""

    def __getattr__(self, name: str) -> FirestoreCollection:
        return FirestoreCollection(name)


# ==================== QUERY TRANSLATION ====================

def _mongo_query_to_firestore(query: Dict) -> List[Dict]:
    """Convert a MongoDB-style query to Firestore filters"""
    filters = []
    for field, value in query.items():
        if field == "_id":
            continue
        if isinstance(value, dict):
            for op, val in value.items():
                if op == "$gte":
                    filters.append({"field": field, "op": ">=", "value": _serialize_value(val)})
                elif op == "$gt":
                    filters.append({"field": field, "op": ">", "value": _serialize_value(val)})
                elif op == "$lte":
                    filters.append({"field": field, "op": "<=", "value": _serialize_value(val)})
                elif op == "$lt":
                    filters.append({"field": field, "op": "<", "value": _serialize_value(val)})
                elif op == "$ne":
                    filters.append({"field": field, "op": "!=", "value": _serialize_value(val)})
                elif op == "$in":
                    filters.append({"field": field, "op": "in", "value": val})
        else:
            filters.append({"field": field, "op": "==", "value": _serialize_value(value)})
    return filters


def _serialize_value(val):
    """Serialize a value for Firestore"""
    if isinstance(val, datetime):
        return val
    return val


def _serialize_doc(doc: Dict) -> Dict:
    """Prepare a document for Firestore storage"""
    result = {}
    for k, v in doc.items():
        if k == "_id":
            continue
        result[k] = v
    return result


# ==================== SINGLETON DB INSTANCE ====================

db = FirestoreDB()
