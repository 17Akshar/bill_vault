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
        """Execute query and return list of docs"""
        def _execute():
            query = self._ref
            for f in self._filters:
                query = query.where(filter=FieldFilter(f["field"], f["op"], f["value"]))
            if self._sort_field:
                query = query.order_by(self._sort_field, direction=self._sort_dir or firestore.Query.ASCENDING)
            limit = self._limit_val or max_count
            query = query.limit(limit)
            docs = query.stream()
            results = []
            for doc in docs:
                d = doc.to_dict()
                if d and self._projection:
                    if "_id" in self._projection and self._projection["_id"] == 0:
                        d.pop("_id", None)
                # Convert datetime objects to ISO strings for JSON serialization
                for k, v in list(d.items()):
                    if isinstance(v, datetime):
                        d[k] = v.isoformat()
                results.append(d)
            return results
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
            q = self._col
            filters = _mongo_query_to_firestore(query)
            for f in filters:
                q = q.where(filter=FieldFilter(f["field"], f["op"], f["value"]))
            q = q.limit(1)
            docs = list(q.stream())
            if docs:
                d = docs[0].to_dict()
                if d and projection and "_id" in projection and projection["_id"] == 0:
                    d.pop("_id", None)
                for k, v in list(d.items()):
                    if isinstance(v, datetime):
                        d[k] = v.isoformat()
                return d
            return None
        return await asyncio.to_thread(_execute)

    async def insert_one(self, document: Dict):
        """Insert a document"""
        def _execute():
            doc = _serialize_doc(document)
            # Use a unique ID field if present, otherwise auto-generate
            doc_id = None
            for key in ["user_id", "account_id", "bill_id", "income_id", "expense_id",
                        "investment_id", "heading_id", "reminder_id", "note_id",
                        "family_member_id", "card_id", "loan_id", "lending_id",
                        "rental_id", "payment_id", "note_id"]:
                if key in doc:
                    doc_id = doc[key]
                    break
            if doc_id:
                self._col.document(doc_id).set(doc)
            else:
                self._col.add(doc)
        return await asyncio.to_thread(_execute)

    async def update_one(self, query: Dict, update: Dict, upsert: bool = False):
        """Update a single document"""
        def _execute():
            # Find the document first
            q = self._col
            filters = _mongo_query_to_firestore(query)
            for f in filters:
                q = q.where(filter=FieldFilter(f["field"], f["op"], f["value"]))
            q = q.limit(1)
            docs = list(q.stream())

            update_data = {}
            if "$set" in update:
                update_data = _serialize_doc(update["$set"])
            elif "$inc" in update:
                if docs:
                    existing = docs[0].to_dict()
                    for k, v in update["$inc"].items():
                        update_data[k] = existing.get(k, 0) + v
            else:
                update_data = _serialize_doc(update)

            if docs:
                docs[0].reference.update(update_data)
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
                    self._col.add(merged)
        return await asyncio.to_thread(_execute)

    async def update_many(self, query: Dict, update: Dict):
        """Update all matching documents"""
        def _execute():
            q = self._col
            filters = _mongo_query_to_firestore(query)
            for f in filters:
                q = q.where(filter=FieldFilter(f["field"], f["op"], f["value"]))
            docs = list(q.stream())

            update_data = {}
            if "$set" in update:
                update_data = _serialize_doc(update["$set"])
            else:
                update_data = _serialize_doc(update)

            batch = get_firestore_client().batch()
            for doc in docs:
                batch.update(doc.reference, update_data)
            batch.commit()
        return await asyncio.to_thread(_execute)

    async def delete_one(self, query: Dict):
        """Delete a single document"""
        def _execute():
            q = self._col
            filters = _mongo_query_to_firestore(query)
            for f in filters:
                q = q.where(filter=FieldFilter(f["field"], f["op"], f["value"]))
            q = q.limit(1)
            docs = list(q.stream())
            if docs:
                docs[0].reference.delete()
        return await asyncio.to_thread(_execute)

    async def delete_many(self, query: Dict):
        """Delete all matching documents"""
        def _execute():
            q = self._col
            filters = _mongo_query_to_firestore(query)
            for f in filters:
                q = q.where(filter=FieldFilter(f["field"], f["op"], f["value"]))
            docs = list(q.stream())
            batch = get_firestore_client().batch()
            for doc in docs:
                batch.delete(doc.reference)
            batch.commit()
        return await asyncio.to_thread(_execute)

    async def count_documents(self, query: Dict) -> int:
        """Count matching documents"""
        def _execute():
            q = self._col
            filters = _mongo_query_to_firestore(query)
            for f in filters:
                q = q.where(filter=FieldFilter(f["field"], f["op"], f["value"]))
            return len(list(q.stream()))
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
