from fastapi import FastAPI, APIRouter, HTTPException, Header, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from pathlib import Path
from io import StringIO
import csv
import os
import logging
import uuid
import bcrypt
import jwt
import httpx
import math

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# ==================== MODELS ====================

# Import Indian currency utilities
from indian_currency import format_indian_currency, inr

class User(BaseModel):
    user_id: str
    email: str
    name: str
    mobile_number: Optional[str] = None
    security_question: Optional[str] = None
    security_answer: Optional[str] = None
    email_verified: bool = False
    verification_token: Optional[str] = None
    picture: Optional[str] = None
    created_at: datetime
    use_single_user_mode: bool = False

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    mobile_number: str
    security_question: str
    security_answer: str

class UserLogin(BaseModel):
    email: str
    password: str

# Family Member Model
class FamilyMember(BaseModel):
    family_member_id: str
    user_id: str
    name: str
    role: str  # self, spouse, child, parent
    is_active: bool = True
    created_at: datetime

class FamilyMemberCreate(BaseModel):
    name: str
    role: str

# Account Model
class Account(BaseModel):
    account_id: str
    user_id: str
    family_member_id: Optional[str] = None
    name: str
    account_type: str  # bank, cash, upi, credit_card
    balance: float = 0.0
    account_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class AccountCreate(BaseModel):
    name: str
    account_type: str
    initial_balance: float = 0.0
    account_number: Optional[str] = None
    family_member_id: Optional[str] = None

class AccountUpdate(BaseModel):
    name: Optional[str] = None
    account_number: Optional[str] = None

# Income Model
class Income(BaseModel):
    income_id: str
    user_id: str
    family_member_id: Optional[str] = None
    account_id: str
    amount: float
    category: str  # salary, rental, business, other
    sub_category: Optional[str] = None
    source: str
    date: datetime
    notes: Optional[str] = None
    created_at: datetime

class IncomeCreate(BaseModel):
    account_id: str
    amount: float
    category: str
    sub_category: Optional[str] = None
    source: str
    date: str
    notes: Optional[str] = None
    family_member_id: Optional[str] = None

class IncomeUpdate(BaseModel):
    account_id: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    source: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None

# Expense Model
class Expense(BaseModel):
    expense_id: str
    user_id: str
    family_member_id: Optional[str] = None
    account_id: str
    amount: float
    category: str
    sub_category: Optional[str] = None
    payment_type: str  # cash, bank, credit_card, upi
    description: str
    date: datetime
    notes: Optional[str] = None
    created_at: datetime

class ExpenseCreate(BaseModel):
    account_id: str
    amount: float
    category: str
    sub_category: Optional[str] = None
    payment_type: str
    description: str
    date: str
    notes: Optional[str] = None
    family_member_id: Optional[str] = None

class ExpenseUpdate(BaseModel):
    account_id: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    sub_category: Optional[str] = None
    payment_type: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None

# ==================== PHASE 2 MODELS ====================

# Credit Card Model
class CreditCardCreate(BaseModel):
    name: str
    card_number_last4: str = ""
    credit_limit: float
    current_outstanding: float = 0.0
    billing_date: int = 1
    due_date: int = 15
    due_time: str = "10:00"  # HH:MM
    interest_rate: float = 0.0
    family_member_id: Optional[str] = None
    # EMI fields
    emis: Optional[List[Dict]] = []  # [{name, amount, tenure_remaining, total_tenure, start_date}]

class CreditCardUpdate(BaseModel):
    name: Optional[str] = None
    credit_limit: Optional[float] = None
    current_outstanding: Optional[float] = None
    billing_date: Optional[int] = None
    due_date: Optional[int] = None
    due_time: Optional[str] = None
    interest_rate: Optional[float] = None
    emis: Optional[List[Dict]] = None

# Loan Model
class LoanCreate(BaseModel):
    name: str
    loan_type: str  # home, car, personal, education, gold, other
    principal_amount: float
    outstanding_amount: float
    interest_rate: float
    emi_amount: float
    tenure_months: int
    start_date: str
    next_emi_date: Optional[str] = None
    account_id: Optional[str] = None
    family_member_id: Optional[str] = None
    notes: Optional[str] = None

class LoanUpdate(BaseModel):
    name: Optional[str] = None
    outstanding_amount: Optional[float] = None
    emi_amount: Optional[float] = None
    next_emi_date: Optional[str] = None
    notes: Optional[str] = None

# Lending (Money Lent / Borrowed) Model
class LendingCreate(BaseModel):
    lending_type: str  # lent, borrowed
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

# Investment Model
class InvestmentCreate(BaseModel):
    name: str
    investment_type: str  # stocks, mutual_fund, fd, rd, ppf, nps, gold, real_estate, crypto, other
    invested_amount: float
    current_value: float
    purchase_date: str
    maturity_date: Optional[str] = None
    family_member_id: Optional[str] = None
    notes: Optional[str] = None
    heading_id: Optional[str] = None
    sub_category: Optional[str] = None

class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    current_value: Optional[float] = None
    maturity_date: Optional[str] = None
    notes: Optional[str] = None

# Reminder Model
class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    reminder_date: str  # ISO date
    reminder_type: str  # investment, loan_emi, credit_card, lending, bill, custom
    related_id: Optional[str] = None  # Links to investment_id, loan_id, card_id, lending_id, bill_id
    is_recurring: bool = False
    recurrence: Optional[str] = None  # daily, weekly, monthly, yearly

class ReminderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    reminder_date: Optional[str] = None
    is_completed: Optional[bool] = None
    is_recurring: Optional[bool] = None
    recurrence: Optional[str] = None

# Rental Income Models
class RentalCreate(BaseModel):
    property_name: str
    tenant_name: str = ""
    rent_amount: float
    due_day: int = 1  # Day of month rent is due
    address: str = ""
    notes: str = ""

class RentalUpdate(BaseModel):
    property_name: Optional[str] = None
    tenant_name: Optional[str] = None
    rent_amount: Optional[float] = None
    due_day: Optional[int] = None
    address: Optional[str] = None
    notes: Optional[str] = None

class RentalPaymentCreate(BaseModel):
    rental_id: str
    amount: float
    payment_date: str
    notes: str = ""

# Investment Heading Models
class InvestmentHeadingCreate(BaseModel):
    name: str  # e.g., "Shares", "Mutual Funds"
    icon: str = "trending-up"

class InvestmentHeadingUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None

class Bill(BaseModel):
    bill_id: str
    user_id: str
    family_member_id: Optional[str] = None
    account_id: Optional[str] = None
    name: str
    amount: float
    currency: str = "INR"
    due_date: datetime
    category: str
    vendor: Optional[str] = None
    notes: Optional[str] = None
    receipt_image: Optional[str] = None  # base64 encoded
    is_recurring: bool = False
    recurrence_type: Optional[str] = None  # daily, weekly, monthly, yearly
    recurrence_interval: Optional[int] = 1
    payment_status: str = "unpaid"  # unpaid, paid
    created_at: datetime
    updated_at: datetime

class BillCreate(BaseModel):
    name: str
    amount: float
    currency: str = "INR"
    due_date: str
    category: str
    vendor: Optional[str] = None
    notes: Optional[str] = None
    receipt_image: Optional[str] = None
    is_recurring: bool = False
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = 1
    account_id: Optional[str] = None
    family_member_id: Optional[str] = None

class BillUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    due_date: Optional[str] = None
    category: Optional[str] = None
    vendor: Optional[str] = None
    notes: Optional[str] = None
    receipt_image: Optional[str] = None
    is_recurring: Optional[bool] = None
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = None
    payment_status: Optional[str] = None
    account_id: Optional[str] = None

class Payment(BaseModel):
    payment_id: str
    bill_id: str
    user_id: str
    amount: float
    payment_date: datetime
    payment_method: Optional[str] = None
    confirmation_number: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class PaymentCreate(BaseModel):
    bill_id: str
    amount: float
    payment_date: str
    payment_method: Optional[str] = None
    confirmation_number: Optional[str] = None
    notes: Optional[str] = None

class Budget(BaseModel):
    budget_id: str
    user_id: str
    category: str
    monthly_limit: float
    created_at: datetime
    updated_at: datetime

class BudgetCreate(BaseModel):
    category: str
    monthly_limit: float

class BudgetUpdate(BaseModel):
    monthly_limit: Optional[float] = None
    category: Optional[str] = None

class Category(BaseModel):
    category_id: str
    user_id: str
    name: str
    color: str
    icon: Optional[str] = None
    created_at: datetime

class CategoryCreate(BaseModel):
    name: str
    color: str
    icon: Optional[str] = None

class UserSettings(BaseModel):
    user_id: str
    dark_mode: bool = False
    notifications_enabled: bool = True
    notification_days_before: int = 3
    default_currency: str = "USD"
    storage_provider: str = "local"  # local, google_drive, onedrive
    updated_at: datetime

class SettingsUpdate(BaseModel):
    dark_mode: Optional[bool] = None
    notifications_enabled: Optional[bool] = None
    notification_days_before: Optional[int] = None
    default_currency: Optional[str] = None
    storage_provider: Optional[str] = None

# ==================== HELPER FUNCTIONS ====================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        logger.info(f"Token verified successfully: {payload}")
        return payload
    except jwt.ExpiredSignatureError as e:
        logger.error(f"Token expired: {e}")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token error: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        logger.error(f"Unexpected error verifying token: {type(e).__name__}: {e}")
        raise HTTPException(status_code=401, detail=f"Token verification failed: {str(e)}")

async def get_current_user(request: Request):
    """Get current user from session_token cookie or Authorization header"""
    token = None
    
    # First try to get from cookie
    token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not token:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if auth_header:
            if auth_header.startswith("Bearer "):
                token = auth_header[7:]  # Remove "Bearer " prefix
            else:
                token = auth_header
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a session token (Google OAuth)
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session_doc:
        # Verify session not expired
        expires_at = session_doc["expires_at"]
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        # Get user
        user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0, "password_hash": 0})
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        return User(**user_doc)
    
    # Otherwise verify JWT token
    payload = verify_token(token)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user_doc)

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register new user with email/password"""
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
    
    # Create user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hashed_password.decode('utf-8'),
        "picture": None,
        "created_at": datetime.now(timezone.utc),
        "use_single_user_mode": False
    }
    
    await db.users.insert_one(user)
    
    # Create default settings
    settings = {
        "user_id": user_id,
        "dark_mode": False,
        "notifications_enabled": True,
        "notification_days_before": 3,
        "default_currency": "USD",
        "storage_provider": "local",
        "updated_at": datetime.now(timezone.utc)
    }
    await db.user_settings.insert_one(settings)
    
    # Create token
    access_token = create_access_token({"user_id": user_id, "email": user_data.email})
    
    # Return user data without password
    user.pop("password_hash")
    user.pop("_id", None)
    
    return {
        "user": user,
        "access_token": access_token,
        "token_type": "bearer"
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    """Login with email/password"""
    user_doc = await db.users.find_one({"email": credentials.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not bcrypt.checkpw(credentials.password.encode('utf-8'), user_doc["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create token
    access_token = create_access_token({"user_id": user_doc["user_id"], "email": user_doc["email"]})
    
    # Return user data without password
    user_doc.pop("password_hash")
    user_doc.pop("_id", None)
    
    return {
        "user": user_doc,
        "access_token": access_token,
        "token_type": "bearer"
    }

@api_router.post("/auth/google/session")
async def google_auth_session(request: Request, response: Response):
    """REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH"""
    data = await request.json()
    session_id = data.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get session data
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = auth_response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Auth service error: {str(e)}")
    
    # Get or create user
    user_doc = await db.users.find_one({"email": session_data["email"]}, {"_id": 0})
    
    if not user_doc:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": session_data["email"],
            "name": session_data.get("name", ""),
            "picture": session_data.get("picture"),
            "created_at": datetime.now(timezone.utc),
            "use_single_user_mode": False
        }
        await db.users.insert_one(user_doc)
        
        # Create default settings
        settings = {
            "user_id": user_id,
            "dark_mode": False,
            "notifications_enabled": True,
            "notification_days_before": 3,
            "storage_provider": "local",
            "updated_at": datetime.now(timezone.utc)
        }
        await db.user_settings.insert_one(settings)
        
        user_doc.pop("_id", None)
    else:
        # Update user info if needed
        await db.users.update_one(
            {"user_id": user_doc["user_id"]},
            {"$set": {
                "name": session_data.get("name", user_doc.get("name", "")),
                "picture": session_data.get("picture", user_doc.get("picture"))
            }}
        )
    
    # Store session
    session_token = session_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    await db.user_sessions.insert_one({
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7*24*60*60
    )
    
    return {"user": user_doc, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    """Get current authenticated user"""
    user = await get_current_user(request=request)
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
        response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.post("/auth/single-user")
async def single_user_mode():
    """Create or get single-user mode user"""
    # Check if single user exists
    user_doc = await db.users.find_one({"use_single_user_mode": True}, {"_id": 0})
    
    if not user_doc:
        # Create single user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": "single-user@local",
            "name": "Local User",
            "picture": None,
            "created_at": datetime.now(timezone.utc),
            "use_single_user_mode": True
        }
        await db.users.insert_one(user_doc)
        
        # Create default settings
        settings = {
            "user_id": user_id,
            "dark_mode": False,
            "notifications_enabled": True,
            "notification_days_before": 3,
            "storage_provider": "local",
            "updated_at": datetime.now(timezone.utc)
        }
        await db.user_settings.insert_one(settings)
        
        user_doc.pop("_id", None)
    
    # Create token
    access_token = create_access_token({"user_id": user_doc["user_id"], "email": user_doc["email"]})
    
    return {
        "user": user_doc,
        "access_token": access_token,
        "token_type": "bearer"
    }

# ==================== BILL ENDPOINTS ====================

@api_router.post("/bills", response_model=Bill)
async def create_bill(bill_data: BillCreate, request: Request, authorization: Optional[str] = Header(None)):
    """Create new bill"""
    user = await get_current_user(request)
    
    bill_id = f"bill_{uuid.uuid4().hex[:12]}"
    bill = {
        "bill_id": bill_id,
        "user_id": user.user_id,
        "name": bill_data.name,
        "amount": bill_data.amount,
        "due_date": datetime.fromisoformat(bill_data.due_date.replace('Z', '+00:00')),
        "category": bill_data.category,
        "vendor": bill_data.vendor,
        "notes": bill_data.notes,
        "receipt_image": bill_data.receipt_image,
        "is_recurring": bill_data.is_recurring,
        "recurrence_type": bill_data.recurrence_type,
        "recurrence_interval": bill_data.recurrence_interval,
        "payment_status": "unpaid",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.bills.insert_one(bill)
    bill.pop("_id", None)
    
    return Bill(**bill)

@api_router.get("/bills", response_model=List[Bill])
async def get_bills(
    request: Request,
    authorization: Optional[str] = Header(None),
    month: Optional[int] = None,
    year: Optional[int] = None,
    category: Optional[str] = None,
    status: Optional[str] = None
):
    """Get all bills for user with optional filtering"""
    user = await get_current_user(request)
    
    query = {"user_id": user.user_id}
    
    # Filter by month/year
    if month and year:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        query["due_date"] = {"$gte": start_date, "$lt": end_date}
    
    # Filter by category
    if category:
        query["category"] = category
    
    # Filter by status
    if status:
        query["payment_status"] = status
    
    bills = await db.bills.find(query, {"_id": 0}).sort("due_date", 1).to_list(1000)
    return [Bill(**bill) for bill in bills]

@api_router.get("/bills/summary")
async def bills_summary_early(request: Request):
    """Get bills with overdue/upcoming/paid status"""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    all_bills = await db.bills.find({"user_id": user.user_id}, {"_id": 0}).sort("due_date", 1).to_list(1000)

    overdue = []
    upcoming = []
    paid_bills = []
    for b in all_bills:
        due = b.get("due_date")
        if isinstance(due, str):
            try:
                due = datetime.fromisoformat(due.replace('Z', '+00:00'))
            except:
                due = None
        elif isinstance(due, datetime):
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
        status = b.get("payment_status", b.get("status", "pending"))
        if status == "paid":
            paid_bills.append({**b, "bill_status": "paid"})
        elif due and due < now:
            overdue.append({**b, "bill_status": "overdue", "days_overdue": (now - due).days})
        else:
            days_until = (due - now).days if due else 999
            upcoming.append({**b, "bill_status": "upcoming", "days_until": days_until})

    return {
        "overdue": overdue, "overdue_count": len(overdue),
        "upcoming": upcoming, "upcoming_count": len(upcoming),
        "paid": paid_bills, "paid_count": len(paid_bills),
        "total_overdue_amount": sum(b.get("amount", 0) for b in overdue),
        "total_upcoming_amount": sum(b.get("amount", 0) for b in upcoming),
    }

@api_router.get("/bills/{bill_id}", response_model=Bill)
async def get_bill(bill_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """Get specific bill"""
    user = await get_current_user(request)
    
    bill_doc = await db.bills.find_one({"bill_id": bill_id, "user_id": user.user_id}, {"_id": 0})
    if not bill_doc:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    return Bill(**bill_doc)

@api_router.put("/bills/{bill_id}", response_model=Bill)
async def update_bill(bill_id: str, bill_data: BillUpdate, request: Request, authorization: Optional[str] = Header(None)):
    """Update bill"""
    user = await get_current_user(request)
    
    # Check bill exists and belongs to user
    existing_bill = await db.bills.find_one({"bill_id": bill_id, "user_id": user.user_id})
    if not existing_bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Prepare update data
    update_data = {k: v for k, v in bill_data.dict(exclude_unset=True).items() if v is not None}
    if "due_date" in update_data:
        update_data["due_date"] = datetime.fromisoformat(update_data["due_date"].replace('Z', '+00:00'))
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    # Update bill
    await db.bills.update_one(
        {"bill_id": bill_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    # Get updated bill
    updated_bill = await db.bills.find_one({"bill_id": bill_id}, {"_id": 0})
    return Bill(**updated_bill)

@api_router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, request: Request, authorization: Optional[str] = Header(None)):
    """Delete bill"""
    user = await get_current_user(request)
    
    result = await db.bills.delete_one({"bill_id": bill_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Also delete associated payments
    await db.payments.delete_many({"bill_id": bill_id})
    
    return {"message": "Bill deleted successfully"}

# ==================== PAYMENT ENDPOINTS ====================

@api_router.post("/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, request: Request, authorization: Optional[str] = Header(None)):
    """Record a payment"""
    user = await get_current_user(request)
    
    # Verify bill exists and belongs to user
    bill = await db.bills.find_one({"bill_id": payment_data.bill_id, "user_id": user.user_id})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    payment_id = f"payment_{uuid.uuid4().hex[:12]}"
    payment = {
        "payment_id": payment_id,
        "bill_id": payment_data.bill_id,
        "user_id": user.user_id,
        "amount": payment_data.amount,
        "payment_date": datetime.fromisoformat(payment_data.payment_date.replace('Z', '+00:00')),
        "payment_method": payment_data.payment_method,
        "confirmation_number": payment_data.confirmation_number,
        "notes": payment_data.notes,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.payments.insert_one(payment)
    
    # Update bill status to paid
    await db.bills.update_one(
        {"bill_id": payment_data.bill_id},
        {"$set": {"payment_status": "paid", "updated_at": datetime.now(timezone.utc)}}
    )
    
    payment.pop("_id", None)
    return Payment(**payment)

@api_router.get("/payments", response_model=List[Payment])
async def get_payments(request: Request, authorization: Optional[str] = Header(None), bill_id: Optional[str] = None):
    """Get payment history"""
    user = await get_current_user(request)
    
    query = {"user_id": user.user_id}
    if bill_id:
        query["bill_id"] = bill_id
    
    payments = await db.payments.find(query, {"_id": 0}).sort("payment_date", -1).to_list(1000)
    return [Payment(**payment) for payment in payments]

# ==================== CATEGORY ENDPOINTS ====================

@api_router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, request: Request, authorization: Optional[str] = Header(None)):
    """Create custom category"""
    user = await get_current_user(request)
    
    # Check if category already exists
    existing = await db.categories.find_one({"user_id": user.user_id, "name": category_data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Category already exists")
    
    category_id = f"cat_{uuid.uuid4().hex[:12]}"
    category = {
        "category_id": category_id,
        "user_id": user.user_id,
        "name": category_data.name,
        "color": category_data.color,
        "icon": category_data.icon,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.categories.insert_one(category)
    category.pop("_id", None)
    
    return Category(**category)

@api_router.get("/categories", response_model=List[Category])
async def get_categories(request: Request, authorization: Optional[str] = Header(None)):
    """Get all categories"""
    user = await get_current_user(request)
    
    categories = await db.categories.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return [Category(**cat) for cat in categories]

# ==================== BUDGET ENDPOINTS ====================

@api_router.post("/budgets", response_model=Budget)
async def create_budget(budget_data: BudgetCreate, request: Request, authorization: Optional[str] = Header(None)):
    """Set budget limit for category"""
    user = await get_current_user(request)
    
    # Check if budget already exists for this category
    existing = await db.budgets.find_one({"user_id": user.user_id, "category": budget_data.category})
    if existing:
        # Update existing budget
        await db.budgets.update_one(
            {"user_id": user.user_id, "category": budget_data.category},
            {"$set": {"monthly_limit": budget_data.monthly_limit, "updated_at": datetime.now(timezone.utc)}}
        )
        updated_budget = await db.budgets.find_one({"user_id": user.user_id, "category": budget_data.category}, {"_id": 0})
        return Budget(**updated_budget)
    
    budget_id = f"budget_{uuid.uuid4().hex[:12]}"
    budget = {
        "budget_id": budget_id,
        "user_id": user.user_id,
        "category": budget_data.category,
        "monthly_limit": budget_data.monthly_limit,
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    await db.budgets.insert_one(budget)
    budget.pop("_id", None)
    
    return Budget(**budget)

@api_router.get("/budgets", response_model=List[Budget])
async def get_budgets(request: Request, authorization: Optional[str] = Header(None)):
    """Get all budgets"""
    user = await get_current_user(request)
    
    budgets = await db.budgets.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    return [Budget(**budget) for budget in budgets]

@api_router.get("/budgets/progress")
async def get_budget_progress(request: Request, month: Optional[int] = None, year: Optional[int] = None):
    """Get budget progress with actual spending per category"""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    budgets = await db.budgets.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)

    # Get expenses for this month
    expenses = await db.expenses.find({
        "user_id": user.user_id,
        "date": {"$gte": datetime(y, m, 1, tzinfo=timezone.utc),
                 "$lt": datetime(y + (1 if m == 12 else 0), (m % 12) + 1, 1, tzinfo=timezone.utc)}
    }, {"_id": 0}).to_list(50000)

    # Calculate spending per category
    spending: Dict = {}
    for exp in expenses:
        cat = exp.get("category", "other")
        spending[cat] = spending.get(cat, 0) + exp.get("amount", 0)

    total_budgeted = 0
    total_spent = 0
    progress = []
    for b in budgets:
        cat = b["category"]
        limit = b["monthly_limit"]
        spent = spending.get(cat, 0)
        total_budgeted += limit
        total_spent += spent
        pct = round((spent / limit * 100), 1) if limit > 0 else 0
        remaining = limit - spent
        status = "over_budget" if spent > limit else "warning" if pct > 80 else "on_track"
        progress.append({
            "budget_id": b["budget_id"],
            "category": cat,
            "monthly_limit": limit,
            "spent": spent,
            "remaining": remaining,
            "percentage": pct,
            "status": status,
        })

    progress.sort(key=lambda x: x["percentage"], reverse=True)

    # Unbudgeted spending (categories with expenses but no budget)
    unbudgeted = []
    budgeted_cats = {b["category"] for b in budgets}
    for cat, amount in spending.items():
        if cat not in budgeted_cats:
            unbudgeted.append({"category": cat, "spent": amount})

    return {
        "month": m, "year": y,
        "total_budgeted": total_budgeted,
        "total_spent": total_spent,
        "overall_percentage": round((total_spent / total_budgeted * 100), 1) if total_budgeted > 0 else 0,
        "budgets": progress,
        "unbudgeted_spending": sorted(unbudgeted, key=lambda x: x["spent"], reverse=True),
    }

@api_router.put("/budgets/{budget_id}")
async def update_budget(budget_id: str, data: BudgetUpdate, request: Request):
    """Update a budget"""
    user = await get_current_user(request)
    existing = await db.budgets.find_one({"budget_id": budget_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Budget not found")
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.budgets.update_one({"budget_id": budget_id}, {"$set": update_data})
    updated = await db.budgets.find_one({"budget_id": budget_id}, {"_id": 0})
    return Budget(**updated)

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, request: Request):
    """Delete a budget"""
    user = await get_current_user(request)
    result = await db.budgets.delete_one({"budget_id": budget_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    return {"message": "Budget deleted"}

# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/spending")
async def get_spending_analytics(
    request: Request,
    authorization: Optional[str] = Header(None),
    month: Optional[int] = None,
    year: Optional[int] = None
):
    """Get spending analytics"""
    user = await get_current_user(request)
    
    # Default to current month
    if not month or not year:
        now = datetime.now(timezone.utc)
        month = now.month
        year = now.year
    
    # Get all bills for the month
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    bills = await db.bills.find({
        "user_id": user.user_id,
        "due_date": {"$gte": start_date, "$lt": end_date}
    }, {"_id": 0}).to_list(1000)
    
    # Calculate analytics
    total_amount = sum(bill["amount"] for bill in bills)
    paid_amount = sum(bill["amount"] for bill in bills if bill["payment_status"] == "paid")
    unpaid_amount = total_amount - paid_amount
    
    # Category breakdown
    category_totals = {}
    for bill in bills:
        category = bill["category"]
        if category not in category_totals:
            category_totals[category] = 0
        category_totals[category] += bill["amount"]
    
    # Budget comparison
    budgets = await db.budgets.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    budget_status = []
    for budget in budgets:
        spent = category_totals.get(budget["category"], 0)
        budget_status.append({
            "category": budget["category"],
            "limit": budget["monthly_limit"],
            "spent": spent,
            "remaining": budget["monthly_limit"] - spent,
            "percentage": (spent / budget["monthly_limit"] * 100) if budget["monthly_limit"] > 0 else 0
        })
    
    return {
        "month": month,
        "year": year,
        "total_amount": total_amount,
        "paid_amount": paid_amount,
        "unpaid_amount": unpaid_amount,
        "total_bills": len(bills),
        "paid_bills": len([b for b in bills if b["payment_status"] == "paid"]),
        "unpaid_bills": len([b for b in bills if b["payment_status"] == "unpaid"]),
        "category_breakdown": [{"category": k, "amount": v} for k, v in category_totals.items()],
        "budget_status": budget_status
    }

# ==================== SETTINGS ENDPOINTS ====================

@api_router.get("/settings", response_model=UserSettings)
async def get_settings(request: Request, authorization: Optional[str] = Header(None)):
    """Get user settings"""
    user = await get_current_user(request)
    
    settings = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    if not settings:
        # Create default settings
        settings = {
            "user_id": user.user_id,
            "dark_mode": False,
            "notifications_enabled": True,
            "notification_days_before": 3,
            "storage_provider": "local",
            "updated_at": datetime.now(timezone.utc)
        }
        await db.user_settings.insert_one(settings)
        settings.pop("_id", None)
    
    return UserSettings(**settings)

@api_router.put("/settings", response_model=UserSettings)
async def update_settings(settings_data: SettingsUpdate, request: Request, authorization: Optional[str] = Header(None)):
    """Update user settings"""
    user = await get_current_user(request)
    
    update_data = {k: v for k, v in settings_data.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.user_settings.update_one(
        {"user_id": user.user_id},
        {"$set": update_data},
        upsert=True
    )
    
    settings = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    return UserSettings(**settings)

# ==================== FAMILY MEMBER ENDPOINTS ====================

@api_router.post("/family-members")
async def create_family_member(data: FamilyMemberCreate, request: Request):
    """Create a new family member"""
    user = await get_current_user(request)
    
    member_id = f"fm_{uuid.uuid4().hex[:12]}"
    member = {
        "family_member_id": member_id,
        "user_id": user.user_id,
        "name": data.name,
        "role": data.role,
        "is_active": True,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.family_members.insert_one(member)
    member.pop("_id", None)
    return member

@api_router.get("/family-members")
async def get_family_members(request: Request):
    """Get all family members for user"""
    user = await get_current_user(request)
    
    members = await db.family_members.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return members

@api_router.put("/family-members/{member_id}")
async def update_family_member(member_id: str, data: FamilyMemberCreate, request: Request):
    """Update a family member"""
    user = await get_current_user(request)
    
    existing = await db.family_members.find_one(
        {"family_member_id": member_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    update_data = {"name": data.name, "role": data.role}
    await db.family_members.update_one(
        {"family_member_id": member_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    updated = await db.family_members.find_one(
        {"family_member_id": member_id}, {"_id": 0}
    )
    return updated

@api_router.delete("/family-members/{member_id}")
async def delete_family_member(member_id: str, request: Request):
    """Delete a family member"""
    user = await get_current_user(request)
    
    result = await db.family_members.delete_one(
        {"family_member_id": member_id, "user_id": user.user_id}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Family member not found")
    
    return {"message": "Family member deleted successfully"}

# ==================== ACCOUNT ENDPOINTS ====================

@api_router.post("/accounts")
async def create_account(data: AccountCreate, request: Request):
    """Create a new financial account"""
    user = await get_current_user(request)
    
    # Validate family member if provided
    if data.family_member_id:
        fm = await db.family_members.find_one(
            {"family_member_id": data.family_member_id, "user_id": user.user_id}
        )
        if not fm:
            raise HTTPException(status_code=404, detail="Family member not found")
    
    account_id = f"acc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    account = {
        "account_id": account_id,
        "user_id": user.user_id,
        "family_member_id": data.family_member_id,
        "name": data.name,
        "account_type": data.account_type,
        "balance": data.initial_balance,
        "account_number": data.account_number,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.accounts.insert_one(account)
    account.pop("_id", None)
    return account

@api_router.get("/accounts")
async def get_accounts(
    request: Request,
    account_type: Optional[str] = None,
    family_member_id: Optional[str] = None
):
    """Get all accounts for user with optional filters"""
    user = await get_current_user(request)
    
    query = {"user_id": user.user_id, "is_active": True}
    if account_type:
        query["account_type"] = account_type
    if family_member_id:
        query["family_member_id"] = family_member_id
    
    accounts = await db.accounts.find(query, {"_id": 0}).sort("created_at", 1).to_list(100)
    return accounts

@api_router.get("/accounts/{account_id}")
async def get_account(account_id: str, request: Request):
    """Get a specific account"""
    user = await get_current_user(request)
    
    account = await db.accounts.find_one(
        {"account_id": account_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

@api_router.put("/accounts/{account_id}")
async def update_account(account_id: str, data: AccountUpdate, request: Request):
    """Update an account"""
    user = await get_current_user(request)
    
    existing = await db.accounts.find_one(
        {"account_id": account_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.accounts.update_one(
        {"account_id": account_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    updated = await db.accounts.find_one({"account_id": account_id}, {"_id": 0})
    return updated

@api_router.delete("/accounts/{account_id}")
async def delete_account(account_id: str, request: Request):
    """Soft-delete an account (preserves transaction history)"""
    user = await get_current_user(request)
    
    existing = await db.accounts.find_one(
        {"account_id": account_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Soft delete — mark inactive instead of removing
    await db.accounts.update_one(
        {"account_id": account_id, "user_id": user.user_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"message": "Account deactivated successfully"}

# ==================== INCOME ENDPOINTS ====================

@api_router.post("/income")
async def create_income(data: IncomeCreate, request: Request):
    """Create an income entry and update account balance"""
    user = await get_current_user(request)
    
    # Validate account
    account = await db.accounts.find_one(
        {"account_id": data.account_id, "user_id": user.user_id, "is_active": True}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Validate family member if provided
    if data.family_member_id:
        fm = await db.family_members.find_one(
            {"family_member_id": data.family_member_id, "user_id": user.user_id}
        )
        if not fm:
            raise HTTPException(status_code=404, detail="Family member not found")
    
    income_id = f"inc_{uuid.uuid4().hex[:12]}"
    income = {
        "income_id": income_id,
        "user_id": user.user_id,
        "family_member_id": data.family_member_id,
        "account_id": data.account_id,
        "amount": data.amount,
        "category": data.category,
        "sub_category": data.sub_category,
        "source": data.source,
        "date": datetime.fromisoformat(data.date.replace('Z', '+00:00')),
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.income.insert_one(income)
    
    # Update account balance (+)
    await db.accounts.update_one(
        {"account_id": data.account_id},
        {"$inc": {"balance": data.amount}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    income.pop("_id", None)
    return income

@api_router.get("/income")
async def get_income(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    account_id: Optional[str] = None,
    family_member_id: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None
):
    """Get income entries with advanced filters"""
    user = await get_current_user(request)
    
    query = {"user_id": user.user_id}
    
    # Date range filter
    if start_date and end_date:
        query["date"] = {
            "$gte": datetime.fromisoformat(start_date.replace('Z', '+00:00')),
            "$lte": datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        }
    elif month and year:
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        query["date"] = {"$gte": start, "$lt": end}
    
    if category:
        query["category"] = category
    if account_id:
        query["account_id"] = account_id
    if family_member_id:
        query["family_member_id"] = family_member_id
    
    incomes = await db.income.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return incomes

@api_router.get("/income/{income_id}")
async def get_income_single(income_id: str, request: Request):
    """Get a specific income entry"""
    user = await get_current_user(request)
    
    income = await db.income.find_one(
        {"income_id": income_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not income:
        raise HTTPException(status_code=404, detail="Income entry not found")
    return income

@api_router.put("/income/{income_id}")
async def update_income(income_id: str, data: IncomeUpdate, request: Request):
    """Update an income entry and adjust account balance"""
    user = await get_current_user(request)
    
    existing = await db.income.find_one(
        {"income_id": income_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Income entry not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    
    # Handle amount change → adjust account balance
    if "amount" in update_data:
        old_amount = existing["amount"]
        new_amount = update_data["amount"]
        diff = new_amount - old_amount
        
        account_id = update_data.get("account_id", existing["account_id"])
        
        # If account changed, reverse from old, add to new
        if "account_id" in update_data and update_data["account_id"] != existing["account_id"]:
            await db.accounts.update_one(
                {"account_id": existing["account_id"]},
                {"$inc": {"balance": -old_amount}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
            await db.accounts.update_one(
                {"account_id": update_data["account_id"]},
                {"$inc": {"balance": new_amount}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
        else:
            await db.accounts.update_one(
                {"account_id": existing["account_id"]},
                {"$inc": {"balance": diff}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
    elif "account_id" in update_data and update_data["account_id"] != existing["account_id"]:
        # Account changed but amount didn't
        await db.accounts.update_one(
            {"account_id": existing["account_id"]},
            {"$inc": {"balance": -existing["amount"]}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
        await db.accounts.update_one(
            {"account_id": update_data["account_id"]},
            {"$inc": {"balance": existing["amount"]}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
    
    if "date" in update_data:
        update_data["date"] = datetime.fromisoformat(update_data["date"].replace('Z', '+00:00'))
    
    await db.income.update_one(
        {"income_id": income_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    updated = await db.income.find_one({"income_id": income_id}, {"_id": 0})
    return updated

@api_router.delete("/income/{income_id}")
async def delete_income(income_id: str, request: Request):
    """Delete an income entry and reverse account balance"""
    user = await get_current_user(request)
    
    existing = await db.income.find_one(
        {"income_id": income_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Income entry not found")
    
    # Reverse the balance change
    await db.accounts.update_one(
        {"account_id": existing["account_id"]},
        {"$inc": {"balance": -existing["amount"]}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    await db.income.delete_one({"income_id": income_id, "user_id": user.user_id})
    return {"message": "Income entry deleted successfully"}

# ==================== EXPENSE ENDPOINTS ====================

@api_router.post("/expenses")
async def create_expense(data: ExpenseCreate, request: Request):
    """Create an expense entry and update account balance"""
    user = await get_current_user(request)
    
    # Validate account
    account = await db.accounts.find_one(
        {"account_id": data.account_id, "user_id": user.user_id, "is_active": True}
    )
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    # Validate family member if provided
    if data.family_member_id:
        fm = await db.family_members.find_one(
            {"family_member_id": data.family_member_id, "user_id": user.user_id}
        )
        if not fm:
            raise HTTPException(status_code=404, detail="Family member not found")
    
    expense_id = f"exp_{uuid.uuid4().hex[:12]}"
    expense = {
        "expense_id": expense_id,
        "user_id": user.user_id,
        "family_member_id": data.family_member_id,
        "account_id": data.account_id,
        "amount": data.amount,
        "category": data.category,
        "sub_category": data.sub_category,
        "payment_type": data.payment_type,
        "description": data.description,
        "date": datetime.fromisoformat(data.date.replace('Z', '+00:00')),
        "notes": data.notes,
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.expenses.insert_one(expense)
    
    # Update account balance (-)
    await db.accounts.update_one(
        {"account_id": data.account_id},
        {"$inc": {"balance": -data.amount}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    expense.pop("_id", None)
    return expense

@api_router.get("/expenses")
async def get_expenses(
    request: Request,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    account_id: Optional[str] = None,
    family_member_id: Optional[str] = None,
    payment_type: Optional[str] = None,
    month: Optional[int] = None,
    year: Optional[int] = None
):
    """Get expense entries with advanced filters"""
    user = await get_current_user(request)
    
    query = {"user_id": user.user_id}
    
    # Date range filter
    if start_date and end_date:
        query["date"] = {
            "$gte": datetime.fromisoformat(start_date.replace('Z', '+00:00')),
            "$lte": datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        }
    elif month and year:
        start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        query["date"] = {"$gte": start, "$lt": end}
    
    if category:
        query["category"] = category
    if account_id:
        query["account_id"] = account_id
    if family_member_id:
        query["family_member_id"] = family_member_id
    if payment_type:
        query["payment_type"] = payment_type
    
    expenses = await db.expenses.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return expenses

@api_router.get("/expenses/{expense_id}")
async def get_expense_single(expense_id: str, request: Request):
    """Get a specific expense entry"""
    user = await get_current_user(request)
    
    expense = await db.expenses.find_one(
        {"expense_id": expense_id, "user_id": user.user_id}, {"_id": 0}
    )
    if not expense:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    return expense

@api_router.put("/expenses/{expense_id}")
async def update_expense(expense_id: str, data: ExpenseUpdate, request: Request):
    """Update an expense entry and adjust account balance"""
    user = await get_current_user(request)
    
    existing = await db.expenses.find_one(
        {"expense_id": expense_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    
    # Handle amount change → adjust account balance
    if "amount" in update_data:
        old_amount = existing["amount"]
        new_amount = update_data["amount"]
        diff = new_amount - old_amount
        
        if "account_id" in update_data and update_data["account_id"] != existing["account_id"]:
            # Account changed: reverse old, apply new
            await db.accounts.update_one(
                {"account_id": existing["account_id"]},
                {"$inc": {"balance": old_amount}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
            await db.accounts.update_one(
                {"account_id": update_data["account_id"]},
                {"$inc": {"balance": -new_amount}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
        else:
            # Same account: adjust by diff (negative because expense)
            await db.accounts.update_one(
                {"account_id": existing["account_id"]},
                {"$inc": {"balance": -diff}, "$set": {"updated_at": datetime.now(timezone.utc)}}
            )
    elif "account_id" in update_data and update_data["account_id"] != existing["account_id"]:
        # Account changed but amount didn't
        await db.accounts.update_one(
            {"account_id": existing["account_id"]},
            {"$inc": {"balance": existing["amount"]}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
        await db.accounts.update_one(
            {"account_id": update_data["account_id"]},
            {"$inc": {"balance": -existing["amount"]}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
    
    if "date" in update_data:
        update_data["date"] = datetime.fromisoformat(update_data["date"].replace('Z', '+00:00'))
    
    await db.expenses.update_one(
        {"expense_id": expense_id, "user_id": user.user_id},
        {"$set": update_data}
    )
    
    updated = await db.expenses.find_one({"expense_id": expense_id}, {"_id": 0})
    return updated

@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, request: Request):
    """Delete an expense entry and reverse account balance"""
    user = await get_current_user(request)
    
    existing = await db.expenses.find_one(
        {"expense_id": expense_id, "user_id": user.user_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Expense entry not found")
    
    # Reverse the balance change (add back the expense amount)
    await db.accounts.update_one(
        {"account_id": existing["account_id"]},
        {"$inc": {"balance": existing["amount"]}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    await db.expenses.delete_one({"expense_id": expense_id, "user_id": user.user_id})
    return {"message": "Expense entry deleted successfully"}

# ==================== CREDIT CARD ENDPOINTS ====================

@api_router.post("/credit-cards")
async def create_credit_card(data: CreditCardCreate, request: Request):
    user = await get_current_user(request)
    card_id = f"cc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    card = {
        "card_id": card_id, "user_id": user.user_id, "name": data.name,
        "card_number_last4": data.card_number_last4, "credit_limit": data.credit_limit,
        "current_outstanding": data.current_outstanding, "billing_date": data.billing_date,
        "due_date": data.due_date, "due_time": data.due_time, "interest_rate": data.interest_rate,
        "family_member_id": data.family_member_id, "emis": data.emis or [],
        "is_active": True, "created_at": now, "updated_at": now
    }
    await db.credit_cards.insert_one(card)
    card.pop("_id", None)
    return card

@api_router.get("/credit-cards")
async def get_credit_cards(request: Request):
    user = await get_current_user(request)
    cards = await db.credit_cards.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return cards

@api_router.put("/credit-cards/{card_id}")
async def update_credit_card(card_id: str, data: CreditCardUpdate, request: Request):
    user = await get_current_user(request)
    existing = await db.credit_cards.find_one({"card_id": card_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Credit card not found")
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.credit_cards.update_one({"card_id": card_id}, {"$set": update_data})
    updated = await db.credit_cards.find_one({"card_id": card_id}, {"_id": 0})
    return updated

@api_router.delete("/credit-cards/{card_id}")
async def delete_credit_card(card_id: str, request: Request):
    user = await get_current_user(request)
    existing = await db.credit_cards.find_one({"card_id": card_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Credit card not found")
    await db.credit_cards.update_one({"card_id": card_id}, {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}})
    return {"message": "Credit card deactivated"}

# ==================== LOAN ENDPOINTS ====================

@api_router.post("/loans")
async def create_loan(data: LoanCreate, request: Request):
    user = await get_current_user(request)
    loan_id = f"loan_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    loan = {
        "loan_id": loan_id, "user_id": user.user_id, "name": data.name,
        "loan_type": data.loan_type, "principal_amount": data.principal_amount,
        "outstanding_amount": data.outstanding_amount, "interest_rate": data.interest_rate,
        "emi_amount": data.emi_amount, "tenure_months": data.tenure_months,
        "start_date": datetime.fromisoformat(data.start_date.replace('Z', '+00:00')),
        "next_emi_date": datetime.fromisoformat(data.next_emi_date.replace('Z', '+00:00')) if data.next_emi_date else None,
        "account_id": data.account_id, "family_member_id": data.family_member_id,
        "notes": data.notes, "is_active": True, "created_at": now, "updated_at": now
    }
    await db.loans.insert_one(loan)
    loan.pop("_id", None)
    return loan

@api_router.get("/loans")
async def get_loans(request: Request):
    user = await get_current_user(request)
    loans = await db.loans.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    return loans

@api_router.put("/loans/{loan_id}")
async def update_loan(loan_id: str, data: LoanUpdate, request: Request):
    user = await get_current_user(request)
    existing = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Loan not found")
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "next_emi_date" in update_data and isinstance(update_data["next_emi_date"], str):
        update_data["next_emi_date"] = datetime.fromisoformat(update_data["next_emi_date"].replace('Z', '+00:00'))
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.loans.update_one({"loan_id": loan_id}, {"$set": update_data})
    updated = await db.loans.find_one({"loan_id": loan_id}, {"_id": 0})
    return updated

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, request: Request):
    user = await get_current_user(request)
    existing = await db.loans.find_one({"loan_id": loan_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db.loans.update_one({"loan_id": loan_id}, {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc)}})
    return {"message": "Loan deactivated"}

# ==================== LENDING (LENT/BORROWED) ENDPOINTS ====================

@api_router.post("/lending")
async def create_lending(data: LendingCreate, request: Request):
    user = await get_current_user(request)
    lending_id = f"lend_{uuid.uuid4().hex[:12]}"
    lending = {
        "lending_id": lending_id, "user_id": user.user_id,
        "lending_type": data.lending_type, "person_name": data.person_name,
        "amount": data.amount, "remaining_amount": data.amount,
        "date": datetime.fromisoformat(data.date.replace('Z', '+00:00')),
        "due_date": datetime.fromisoformat(data.due_date.replace('Z', '+00:00')) if data.due_date else None,
        "notes": data.notes, "is_settled": False,
        "created_at": datetime.now(timezone.utc)
    }
    await db.lending.insert_one(lending)
    lending.pop("_id", None)
    return lending

@api_router.get("/lending")
async def get_lending(request: Request, lending_type: Optional[str] = None, is_settled: Optional[bool] = None):
    user = await get_current_user(request)
    query: Dict = {"user_id": user.user_id}
    if lending_type:
        query["lending_type"] = lending_type
    if is_settled is not None:
        query["is_settled"] = is_settled
    records = await db.lending.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    return records

@api_router.put("/lending/{lending_id}")
async def update_lending(lending_id: str, data: LendingUpdate, request: Request):
    user = await get_current_user(request)
    existing = await db.lending.find_one({"lending_id": lending_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Lending record not found")
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "due_date" in update_data and isinstance(update_data["due_date"], str):
        update_data["due_date"] = datetime.fromisoformat(update_data["due_date"].replace('Z', '+00:00'))
    await db.lending.update_one({"lending_id": lending_id}, {"$set": update_data})
    updated = await db.lending.find_one({"lending_id": lending_id}, {"_id": 0})
    return updated

@api_router.delete("/lending/{lending_id}")
async def delete_lending(lending_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.lending.delete_one({"lending_id": lending_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lending record not found")
    return {"message": "Lending record deleted"}

# ==================== INVESTMENT ENDPOINTS ====================

@api_router.post("/investments")
async def create_investment(data: InvestmentCreate, request: Request):
    user = await get_current_user(request)
    inv_id = f"inv_{uuid.uuid4().hex[:12]}"
    investment = {
        "investment_id": inv_id, "user_id": user.user_id, "name": data.name,
        "investment_type": data.investment_type, "invested_amount": data.invested_amount,
        "current_value": data.current_value,
        "purchase_date": datetime.fromisoformat(data.purchase_date.replace('Z', '+00:00')),
        "maturity_date": datetime.fromisoformat(data.maturity_date.replace('Z', '+00:00')) if data.maturity_date else None,
        "family_member_id": data.family_member_id, "notes": data.notes,
        "is_active": True, "created_at": datetime.now(timezone.utc)
    }
    await db.investments.insert_one(investment)
    investment.pop("_id", None)
    return investment

@api_router.get("/investments")
async def get_investments(request: Request, investment_type: Optional[str] = None):
    user = await get_current_user(request)
    query: Dict = {"user_id": user.user_id, "is_active": True}
    if investment_type:
        query["investment_type"] = investment_type
    investments = await db.investments.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return investments

@api_router.put("/investments/{inv_id}")
async def update_investment(inv_id: str, data: InvestmentUpdate, request: Request):
    user = await get_current_user(request)
    existing = await db.investments.find_one({"investment_id": inv_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "maturity_date" in update_data and isinstance(update_data["maturity_date"], str):
        update_data["maturity_date"] = datetime.fromisoformat(update_data["maturity_date"].replace('Z', '+00:00'))
    await db.investments.update_one({"investment_id": inv_id}, {"$set": update_data})
    updated = await db.investments.find_one({"investment_id": inv_id}, {"_id": 0})
    return updated

@api_router.delete("/investments/{inv_id}")
async def delete_investment(inv_id: str, request: Request):
    user = await get_current_user(request)
    existing = await db.investments.find_one({"investment_id": inv_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Investment not found")
    await db.investments.update_one({"investment_id": inv_id}, {"$set": {"is_active": False}})
    return {"message": "Investment removed"}

# ==================== REMINDERS ENDPOINTS ====================

@api_router.post("/reminders")
async def create_reminder(data: ReminderCreate, request: Request):
    user = await get_current_user(request)
    reminder_id = f"rem_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    reminder = {
        "reminder_id": reminder_id, "user_id": user.user_id,
        "title": data.title, "description": data.description,
        "reminder_date": datetime.fromisoformat(data.reminder_date.replace('Z', '+00:00')),
        "reminder_type": data.reminder_type,
        "related_id": data.related_id,
        "is_recurring": data.is_recurring,
        "recurrence": data.recurrence,
        "is_completed": False,
        "created_at": now, "updated_at": now
    }
    await db.reminders.insert_one(reminder)
    reminder.pop("_id", None)
    return reminder

@api_router.get("/reminders")
async def get_reminders(request: Request, reminder_type: Optional[str] = None, is_completed: Optional[bool] = None, upcoming: Optional[bool] = None):
    user = await get_current_user(request)
    query: Dict = {"user_id": user.user_id}
    if reminder_type:
        query["reminder_type"] = reminder_type
    if is_completed is not None:
        query["is_completed"] = is_completed
    if upcoming:
        query["reminder_date"] = {"$gte": datetime.now(timezone.utc)}
        query["is_completed"] = False
    reminders = await db.reminders.find(query, {"_id": 0}).sort("reminder_date", 1).to_list(1000)
    # Enrich with related item details
    for r in reminders:
        if r.get("related_id"):
            if r["reminder_type"] == "investment":
                item = await db.investments.find_one({"investment_id": r["related_id"]}, {"_id": 0, "name": 1, "investment_type": 1, "current_value": 1})
                r["related_item"] = item
            elif r["reminder_type"] == "loan_emi":
                item = await db.loans.find_one({"loan_id": r["related_id"]}, {"_id": 0, "name": 1, "loan_type": 1, "emi_amount": 1})
                r["related_item"] = item
            elif r["reminder_type"] == "credit_card":
                item = await db.credit_cards.find_one({"card_id": r["related_id"]}, {"_id": 0, "name": 1, "current_outstanding": 1})
                r["related_item"] = item
            elif r["reminder_type"] == "lending":
                item = await db.lending.find_one({"lending_id": r["related_id"]}, {"_id": 0, "person_name": 1, "lending_type": 1, "remaining_amount": 1})
                r["related_item"] = item
            elif r["reminder_type"] == "bill":
                item = await db.bills.find_one({"bill_id": r["related_id"]}, {"_id": 0, "name": 1, "amount": 1})
                r["related_item"] = item
    return reminders

@api_router.get("/reminders/summary")
async def get_reminders_summary(request: Request):
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    week_end = today_start + timedelta(days=7)
    
    total = await db.reminders.count_documents({"user_id": user.user_id, "is_completed": False})
    overdue = await db.reminders.count_documents({"user_id": user.user_id, "is_completed": False, "reminder_date": {"$lt": now}})
    today = await db.reminders.count_documents({"user_id": user.user_id, "is_completed": False, "reminder_date": {"$gte": today_start, "$lt": today_end}})
    this_week = await db.reminders.count_documents({"user_id": user.user_id, "is_completed": False, "reminder_date": {"$gte": today_start, "$lt": week_end}})
    
    upcoming_list = await db.reminders.find(
        {"user_id": user.user_id, "is_completed": False, "reminder_date": {"$gte": now}},
        {"_id": 0}
    ).sort("reminder_date", 1).to_list(5)
    
    overdue_list = await db.reminders.find(
        {"user_id": user.user_id, "is_completed": False, "reminder_date": {"$lt": now}},
        {"_id": 0}
    ).sort("reminder_date", -1).to_list(5)
    
    return {
        "total_pending": total,
        "overdue": overdue,
        "today": today,
        "this_week": this_week,
        "upcoming": upcoming_list,
        "overdue_list": overdue_list
    }

@api_router.put("/reminders/{reminder_id}")
async def update_reminder(reminder_id: str, data: ReminderUpdate, request: Request):
    user = await get_current_user(request)
    existing = await db.reminders.find_one({"reminder_id": reminder_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Reminder not found")
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    if "reminder_date" in update_data and isinstance(update_data["reminder_date"], str):
        update_data["reminder_date"] = datetime.fromisoformat(update_data["reminder_date"].replace('Z', '+00:00'))
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.reminders.update_one({"reminder_id": reminder_id}, {"$set": update_data})
    updated = await db.reminders.find_one({"reminder_id": reminder_id}, {"_id": 0})
    return updated

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.reminders.delete_one({"reminder_id": reminder_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}

# ==================== RENTAL INCOME ENDPOINTS ====================

@api_router.post("/rentals")
async def create_rental(data: RentalCreate, request: Request):
    user = await get_current_user(request)
    rental_id = f"rent_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    rental = {
        "rental_id": rental_id, "user_id": user.user_id,
        "property_name": data.property_name, "tenant_name": data.tenant_name,
        "rent_amount": data.rent_amount, "due_day": data.due_day,
        "address": data.address, "notes": data.notes,
        "is_active": True, "payments": [],
        "created_at": now, "updated_at": now
    }
    await db.rentals.insert_one(rental)
    rental.pop("_id", None)
    return rental

@api_router.get("/rentals")
async def get_rentals(request: Request):
    user = await get_current_user(request)
    rentals = await db.rentals.find({"user_id": user.user_id, "is_active": True}, {"_id": 0}).sort("created_at", -1).to_list(100)
    # Enrich with payment status for current month
    now = datetime.now(timezone.utc)
    for r in rentals:
        payments = r.get("payments", [])
        current_month_paid = any(
            p.get("month") == now.month and p.get("year") == now.year for p in payments
        )
        r["current_month_paid"] = current_month_paid
        r["total_collected"] = sum(p.get("amount", 0) for p in payments)
    return rentals

@api_router.post("/rentals/{rental_id}/payments")
async def add_rental_payment(rental_id: str, data: RentalPaymentCreate, request: Request):
    user = await get_current_user(request)
    rental = await db.rentals.find_one({"rental_id": rental_id, "user_id": user.user_id})
    if not rental:
        raise HTTPException(status_code=404, detail="Rental not found")
    payment_date = datetime.fromisoformat(data.payment_date.replace('Z', '+00:00'))
    payment = {
        "payment_id": f"rp_{uuid.uuid4().hex[:8]}",
        "amount": data.amount, "payment_date": payment_date,
        "month": payment_date.month, "year": payment_date.year,
        "notes": data.notes
    }
    await db.rentals.update_one({"rental_id": rental_id}, {"$push": {"payments": payment}, "$set": {"updated_at": datetime.now(timezone.utc)}})
    return payment

@api_router.put("/rentals/{rental_id}")
async def update_rental(rental_id: str, data: RentalUpdate, request: Request):
    user = await get_current_user(request)
    existing = await db.rentals.find_one({"rental_id": rental_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Rental not found")
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.rentals.update_one({"rental_id": rental_id}, {"$set": update_data})
    updated = await db.rentals.find_one({"rental_id": rental_id}, {"_id": 0})
    return updated

@api_router.delete("/rentals/{rental_id}")
async def delete_rental(rental_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.rentals.delete_one({"rental_id": rental_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Rental not found")
    return {"message": "Rental deleted"}

# ==================== INVESTMENT HEADINGS ENDPOINTS ====================

@api_router.post("/investment-headings")
async def create_heading(data: InvestmentHeadingCreate, request: Request):
    user = await get_current_user(request)
    heading_id = f"ih_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    heading = {
        "heading_id": heading_id, "user_id": user.user_id,
        "name": data.name, "icon": data.icon,
        "created_at": now, "updated_at": now
    }
    await db.investment_headings.insert_one(heading)
    heading.pop("_id", None)
    return heading

@api_router.get("/investment-headings")
async def get_headings(request: Request):
    user = await get_current_user(request)
    headings = await db.investment_headings.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    # Enrich with investments under each heading
    for h in headings:
        investments = await db.investments.find({"user_id": user.user_id, "heading_id": h["heading_id"]}, {"_id": 0}).to_list(1000)
        h["investments"] = investments
        h["total_invested"] = sum(i.get("invested_amount", 0) for i in investments)
        h["total_current"] = sum(i.get("current_value", 0) for i in investments)
        h["count"] = len(investments)
    return headings

@api_router.put("/investment-headings/{heading_id}")
async def update_heading(heading_id: str, data: InvestmentHeadingUpdate, request: Request):
    user = await get_current_user(request)
    existing = await db.investment_headings.find_one({"heading_id": heading_id, "user_id": user.user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Heading not found")
    update_data = {k: v for k, v in data.dict(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    await db.investment_headings.update_one({"heading_id": heading_id}, {"$set": update_data})
    updated = await db.investment_headings.find_one({"heading_id": heading_id}, {"_id": 0})
    return updated

@api_router.delete("/investment-headings/{heading_id}")
async def delete_heading(heading_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.investment_headings.delete_one({"heading_id": heading_id, "user_id": user.user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Heading not found")
    return {"message": "Heading deleted"}

# ==================== CREDIT CARD REPORTING ====================

@api_router.get("/credit-cards/report")
async def credit_card_report(request: Request, period: str = "monthly"):
    """Credit card reporting - day/month/year wise"""
    user = await get_current_user(request)
    cards = await db.credit_cards.find({"user_id": user.user_id, "is_active": True}, {"_id": 0}).to_list(100)
    now = datetime.now(timezone.utc)

    total_limit = sum(c.get("credit_limit", 0) for c in cards)
    total_outstanding = sum(c.get("current_outstanding", 0) for c in cards)
    total_available = total_limit - total_outstanding
    total_emi = sum(sum(e.get("amount", 0) for e in c.get("emis", [])) for c in cards)

    # Upcoming due dates
    upcoming_dues = []
    for c in cards:
        due_day = c.get("due_date", 15)
        due_time = c.get("due_time", "10:00")
        # Next due date
        if now.day <= due_day:
            next_due = now.replace(day=due_day)
        else:
            next_month = now.month + 1 if now.month < 12 else 1
            next_year = now.year if now.month < 12 else now.year + 1
            next_due = now.replace(year=next_year, month=next_month, day=min(due_day, 28))
        days_until = (next_due - now).days
        status = "overdue" if days_until < 0 else "critical" if days_until <= 3 else "warning" if days_until <= 7 else "safe"
        upcoming_dues.append({
            "card_id": c["card_id"], "name": c["name"],
            "outstanding": c.get("current_outstanding", 0),
            "due_day": due_day, "due_time": due_time,
            "next_due_date": str(next_due.date()),
            "days_until": days_until, "status": status,
        })
    upcoming_dues.sort(key=lambda x: x["days_until"])

    return {
        "summary": {
            "total_cards": len(cards),
            "total_limit": total_limit,
            "total_outstanding": total_outstanding,
            "total_available": total_available,
            "total_emi": total_emi,
            "utilization": round(total_outstanding / total_limit * 100, 1) if total_limit > 0 else 0,
        },
        "upcoming_dues": upcoming_dues,
        "cards": cards,
    }

# ==================== NET WORTH ENDPOINT ====================

@api_router.get("/net-worth")
async def get_net_worth(request: Request):
    user = await get_current_user(request)
    
    # Assets
    accounts = await db.accounts.find({"user_id": user.user_id, "is_active": True}, {"_id": 0}).to_list(100)
    total_account_balance = sum(a.get("balance", 0) for a in accounts)
    
    investments = await db.investments.find({"user_id": user.user_id, "is_active": True}, {"_id": 0}).to_list(1000)
    total_investment_value = sum(i.get("current_value", 0) for i in investments)
    total_invested = sum(i.get("invested_amount", 0) for i in investments)
    
    lent_records = await db.lending.find({"user_id": user.user_id, "lending_type": "lent", "is_settled": False}, {"_id": 0}).to_list(1000)
    total_lent = sum(l.get("remaining_amount", 0) for l in lent_records)
    
    total_assets = total_account_balance + total_investment_value + total_lent
    
    # Liabilities
    credit_cards = await db.credit_cards.find({"user_id": user.user_id, "is_active": True}, {"_id": 0}).to_list(100)
    total_cc_outstanding = sum(c.get("current_outstanding", 0) for c in credit_cards)
    
    loans = await db.loans.find({"user_id": user.user_id, "is_active": True}, {"_id": 0}).to_list(100)
    total_loan_outstanding = sum(l.get("outstanding_amount", 0) for l in loans)
    
    borrowed_records = await db.lending.find({"user_id": user.user_id, "lending_type": "borrowed", "is_settled": False}, {"_id": 0}).to_list(1000)
    total_borrowed = sum(b.get("remaining_amount", 0) for b in borrowed_records)
    
    total_liabilities = total_cc_outstanding + total_loan_outstanding + total_borrowed
    net_worth = total_assets - total_liabilities
    
    return {
        "net_worth": net_worth,
        "net_worth_formatted": format_indian_currency(net_worth),
        "total_assets": total_assets,
        "total_assets_formatted": format_indian_currency(total_assets),
        "total_liabilities": total_liabilities,
        "total_liabilities_formatted": format_indian_currency(total_liabilities),
        "assets": {
            "accounts": {"total": total_account_balance, "formatted": format_indian_currency(total_account_balance), "items": accounts},
            "investments": {"total": total_investment_value, "invested": total_invested, "formatted": format_indian_currency(total_investment_value), "items": investments},
            "money_lent": {"total": total_lent, "formatted": format_indian_currency(total_lent), "items": lent_records},
        },
        "liabilities": {
            "credit_cards": {"total": total_cc_outstanding, "formatted": format_indian_currency(total_cc_outstanding), "items": credit_cards},
            "loans": {"total": total_loan_outstanding, "formatted": format_indian_currency(total_loan_outstanding), "items": loans},
            "money_borrowed": {"total": total_borrowed, "formatted": format_indian_currency(total_borrowed), "items": borrowed_records},
        }
    }

# ==================== DASHBOARD ENDPOINT ====================

@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    """Get financial dashboard summary"""
    user = await get_current_user(request)
    
    now = datetime.now(timezone.utc)
    month_start = datetime(now.year, now.month, 1, tzinfo=timezone.utc)
    if now.month == 12:
        month_end = datetime(now.year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        month_end = datetime(now.year, now.month + 1, 1, tzinfo=timezone.utc)
    
    # Total balance across all active accounts
    accounts = await db.accounts.find(
        {"user_id": user.user_id, "is_active": True}, {"_id": 0}
    ).to_list(100)
    total_balance = sum(a.get("balance", 0) for a in accounts)
    
    # Monthly income
    monthly_incomes = await db.income.find(
        {"user_id": user.user_id, "date": {"$gte": month_start, "$lt": month_end}},
        {"_id": 0}
    ).to_list(1000)
    total_monthly_income = sum(i["amount"] for i in monthly_incomes)
    
    # Monthly expenses
    monthly_expenses = await db.expenses.find(
        {"user_id": user.user_id, "date": {"$gte": month_start, "$lt": month_end}},
        {"_id": 0}
    ).to_list(1000)
    total_monthly_expenses = sum(e["amount"] for e in monthly_expenses)
    
    # Upcoming bills (unpaid, due within 30 days)
    upcoming_bills = await db.bills.find(
        {
            "user_id": user.user_id,
            "payment_status": "unpaid",
            "due_date": {"$gte": now, "$lte": now + timedelta(days=30)}
        },
        {"_id": 0}
    ).sort("due_date", 1).to_list(10)
    
    # Overdue bills
    overdue_bills = await db.bills.find(
        {
            "user_id": user.user_id,
            "payment_status": "unpaid",
            "due_date": {"$lt": now}
        },
        {"_id": 0}
    ).sort("due_date", 1).to_list(10)
    
    # Recent transactions (last 10 combined income + expenses)
    recent_incomes = await db.income.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("date", -1).to_list(10)
    
    recent_expenses = await db.expenses.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("date", -1).to_list(10)
    
    # Merge and sort recent transactions
    recent_transactions = []
    for inc in recent_incomes:
        recent_transactions.append({
            "type": "income",
            "id": inc["income_id"],
            "amount": inc["amount"],
            "category": inc["category"],
            "description": inc.get("source", ""),
            "date": inc["date"],
            "account_id": inc["account_id"]
        })
    for exp in recent_expenses:
        recent_transactions.append({
            "type": "expense",
            "id": exp["expense_id"],
            "amount": exp["amount"],
            "category": exp["category"],
            "description": exp.get("description", ""),
            "date": exp["date"],
            "account_id": exp["account_id"]
        })
    
    recent_transactions.sort(key=lambda x: x["date"], reverse=True)
    recent_transactions = recent_transactions[:10]
    
    # Income category breakdown for the month
    income_by_category = {}
    for inc in monthly_incomes:
        cat = inc["category"]
        income_by_category[cat] = income_by_category.get(cat, 0) + inc["amount"]
    
    # Expense category breakdown for the month
    expense_by_category = {}
    for exp in monthly_expenses:
        cat = exp["category"]
        expense_by_category[cat] = expense_by_category.get(cat, 0) + exp["amount"]
    
    # Account-wise summary
    account_summary = []
    for acc in accounts:
        account_summary.append({
            "account_id": acc["account_id"],
            "name": acc["name"],
            "account_type": acc["account_type"],
            "balance": acc["balance"]
        })
    
    # Family members
    family_members = await db.family_members.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).to_list(50)
    
    return {
        "total_balance": total_balance,
        "total_balance_formatted": format_indian_currency(total_balance),
        "monthly_income": total_monthly_income,
        "monthly_income_formatted": format_indian_currency(total_monthly_income),
        "monthly_expenses": total_monthly_expenses,
        "monthly_expenses_formatted": format_indian_currency(total_monthly_expenses),
        "monthly_savings": total_monthly_income - total_monthly_expenses,
        "monthly_savings_formatted": format_indian_currency(total_monthly_income - total_monthly_expenses),
        "accounts": account_summary,
        "upcoming_bills": upcoming_bills,
        "overdue_bills": overdue_bills,
        "recent_transactions": recent_transactions,
        "income_by_category": [{"category": k, "amount": v} for k, v in income_by_category.items()],
        "expense_by_category": [{"category": k, "amount": v} for k, v in expense_by_category.items()],
        "family_members": family_members,
        "month": now.month,
        "year": now.year
    }

# ==================== ANALYTICS ENDPOINTS ====================

@api_router.get("/analytics/investment")
async def investment_analytics(request: Request):
    """CAGR, portfolio allocation, top/bottom performers"""
    user = await get_current_user(request)
    investments = await db.investments.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)

    total_invested = sum(i.get("invested_amount", 0) for i in investments)
    total_current = sum(i.get("current_value", 0) for i in investments)
    total_returns = total_current - total_invested
    total_returns_pct = (total_returns / total_invested * 100) if total_invested > 0 else 0

    # Portfolio allocation by type
    allocation = {}
    for inv in investments:
        t = inv.get("investment_type", "other")
        if t not in allocation:
            allocation[t] = {"type": t, "invested": 0, "current": 0, "count": 0}
        allocation[t]["invested"] += inv.get("invested_amount", 0)
        allocation[t]["current"] += inv.get("current_value", 0)
        allocation[t]["count"] += 1
    for k in allocation:
        allocation[k]["percentage"] = round(allocation[k]["current"] / total_current * 100, 1) if total_current > 0 else 0
        allocation[k]["returns"] = allocation[k]["current"] - allocation[k]["invested"]
        allocation[k]["returns_pct"] = round(allocation[k]["returns"] / allocation[k]["invested"] * 100, 1) if allocation[k]["invested"] > 0 else 0

    # CAGR per investment
    performers = []
    now = datetime.now(timezone.utc)
    for inv in investments:
        invested = inv.get("invested_amount", 0)
        current = inv.get("current_value", 0)
        ret = current - invested
        ret_pct = (ret / invested * 100) if invested > 0 else 0
        # CAGR calculation
        purchase_date = inv.get("purchase_date")
        cagr = 0
        if purchase_date and invested > 0 and current > 0:
            if isinstance(purchase_date, str):
                try:
                    purchase_date = datetime.fromisoformat(purchase_date.replace('Z', '+00:00'))
                except:
                    purchase_date = None
            if purchase_date:
                # Ensure both datetimes have timezone info for comparison
                if purchase_date.tzinfo is None:
                    purchase_date = purchase_date.replace(tzinfo=timezone.utc)
                years = max((now - purchase_date).days / 365.25, 0.01)
                try:
                    cagr = round((math.pow(current / invested, 1 / years) - 1) * 100, 2)
                except:
                    cagr = 0
        performers.append({
            "investment_id": inv.get("investment_id"),
            "name": inv.get("name"),
            "type": inv.get("investment_type"),
            "invested": invested,
            "current": current,
            "returns": ret,
            "returns_pct": round(ret_pct, 2),
            "cagr": cagr,
            "purchase_date": str(inv.get("purchase_date", "")),
        })

    performers.sort(key=lambda x: x["returns_pct"], reverse=True)

    return {
        "summary": {
            "total_invested": total_invested,
            "total_current": total_current,
            "total_returns": total_returns,
            "total_returns_pct": round(total_returns_pct, 2),
            "total_investments": len(investments),
        },
        "allocation": list(allocation.values()),
        "top_performers": performers[:5],
        "bottom_performers": list(reversed(performers))[:5] if performers else [],
        "all_performers": performers,
    }


@api_router.get("/analytics/cashflow")
async def cashflow_analytics(request: Request, months: int = 6):
    """Monthly income vs expense trend and savings rate"""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)

    monthly_data = []
    for i in range(months - 1, -1, -1):
        target_date = now - timedelta(days=i * 30)
        m = target_date.month
        y = target_date.year

        income_list = await db.income.find({
            "user_id": user.user_id,
            "date": {"$gte": datetime(y, m, 1, tzinfo=timezone.utc),
                     "$lt": datetime(y + (1 if m == 12 else 0), (m % 12) + 1, 1, tzinfo=timezone.utc)}
        }, {"_id": 0}).to_list(10000)

        expense_list = await db.expenses.find({
            "user_id": user.user_id,
            "date": {"$gte": datetime(y, m, 1, tzinfo=timezone.utc),
                     "$lt": datetime(y + (1 if m == 12 else 0), (m % 12) + 1, 1, tzinfo=timezone.utc)}
        }, {"_id": 0}).to_list(10000)

        total_income = sum(item.get("amount", 0) for item in income_list)
        total_expense = sum(item.get("amount", 0) for item in expense_list)
        savings = total_income - total_expense
        savings_rate = round((savings / total_income * 100), 1) if total_income > 0 else 0

        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        monthly_data.append({
            "month": m,
            "year": y,
            "label": f"{month_names[m - 1]} {y}",
            "short_label": month_names[m - 1],
            "income": total_income,
            "expense": total_expense,
            "savings": savings,
            "savings_rate": savings_rate,
        })

    total_income_all = sum(d["income"] for d in monthly_data)
    total_expense_all = sum(d["expense"] for d in monthly_data)
    avg_savings_rate = round((total_income_all - total_expense_all) / total_income_all * 100, 1) if total_income_all > 0 else 0

    return {
        "monthly": monthly_data,
        "summary": {
            "total_income": total_income_all,
            "total_expense": total_expense_all,
            "total_savings": total_income_all - total_expense_all,
            "avg_savings_rate": avg_savings_rate,
        }
    }


@api_router.get("/analytics/expense-breakdown")
async def expense_breakdown(request: Request, month: Optional[int] = None, year: Optional[int] = None):
    """Category-wise expense breakdown"""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    expenses = await db.expenses.find({
        "user_id": user.user_id,
        "date": {"$gte": datetime(y, m, 1, tzinfo=timezone.utc),
                 "$lt": datetime(y + (1 if m == 12 else 0), (m % 12) + 1, 1, tzinfo=timezone.utc)}
    }, {"_id": 0}).to_list(10000)

    categories: Dict = {}
    total = 0
    for exp in expenses:
        cat = exp.get("category", "other")
        amt = exp.get("amount", 0)
        total += amt
        if cat not in categories:
            categories[cat] = {"category": cat, "amount": 0, "count": 0}
        categories[cat]["amount"] += amt
        categories[cat]["count"] += 1

    for k in categories:
        categories[k]["percentage"] = round(categories[k]["amount"] / total * 100, 1) if total > 0 else 0

    sorted_cats = sorted(categories.values(), key=lambda x: x["amount"], reverse=True)

    return {"total": total, "month": m, "year": y, "categories": sorted_cats}


@api_router.get("/analytics/income-breakdown")
async def income_breakdown(request: Request, month: Optional[int] = None, year: Optional[int] = None):
    """Source-wise income breakdown"""
    user = await get_current_user(request)
    now = datetime.now(timezone.utc)
    m = month or now.month
    y = year or now.year

    incomes = await db.income.find({
        "user_id": user.user_id,
        "date": {"$gte": datetime(y, m, 1, tzinfo=timezone.utc),
                 "$lt": datetime(y + (1 if m == 12 else 0), (m % 12) + 1, 1, tzinfo=timezone.utc)}
    }, {"_id": 0}).to_list(10000)

    categories: Dict = {}
    total = 0
    for inc in incomes:
        cat = inc.get("category", "other")
        amt = inc.get("amount", 0)
        total += amt
        if cat not in categories:
            categories[cat] = {"category": cat, "amount": 0, "count": 0}
        categories[cat]["amount"] += amt
        categories[cat]["count"] += 1

    for k in categories:
        categories[k]["percentage"] = round(categories[k]["amount"] / total * 100, 1) if total > 0 else 0

    sorted_cats = sorted(categories.values(), key=lambda x: x["amount"], reverse=True)

    return {"total": total, "month": m, "year": y, "categories": sorted_cats}


# ==================== CSV EXPORT ENDPOINTS ====================

@api_router.get("/export/transactions-csv")
async def export_transactions_csv(request: Request):
    """Export transactions as CSV"""
    user = await get_current_user(request)
    incomes = await db.income.find({"user_id": user.user_id}, {"_id": 0}).sort("date", -1).to_list(50000)
    expenses = await db.expenses.find({"user_id": user.user_id}, {"_id": 0}).sort("date", -1).to_list(50000)
    accounts = {a["account_id"]: a["name"] for a in await db.accounts.find({"user_id": user.user_id}, {"_id": 0, "account_id": 1, "name": 1}).to_list(100)}

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Type", "Category", "Description", "Amount", "Account", "Payment Type", "Notes"])
    for inc in incomes:
        writer.writerow([str(inc.get("date", "")), "Income", inc.get("category", ""), inc.get("source", ""), inc.get("amount", 0), accounts.get(inc.get("account_id", ""), ""), "", inc.get("notes", "")])
    for exp in expenses:
        writer.writerow([str(exp.get("date", "")), "Expense", exp.get("category", ""), exp.get("description", ""), exp.get("amount", 0), accounts.get(exp.get("account_id", ""), ""), exp.get("payment_type", ""), exp.get("notes", "")])

    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=transactions.csv"})


@api_router.get("/export/investments-csv")
async def export_investments_csv(request: Request):
    """Export investments as CSV"""
    user = await get_current_user(request)
    investments = await db.investments.find({"user_id": user.user_id}, {"_id": 0}).to_list(10000)
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Name", "Type", "Invested Amount", "Current Value", "Returns", "Returns %", "Purchase Date", "Maturity Date", "Notes"])
    for inv in investments:
        invested = inv.get("invested_amount", 0)
        current = inv.get("current_value", 0)
        ret = current - invested
        ret_pct = round(ret / invested * 100, 2) if invested > 0 else 0
        writer.writerow([inv.get("name", ""), inv.get("investment_type", ""), invested, current, ret, f"{ret_pct}%", str(inv.get("purchase_date", "")), str(inv.get("maturity_date", "")), inv.get("notes", "")])
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=investments.csv"})


@api_router.get("/export/networth-csv")
async def export_networth_csv(request: Request):
    """Export net worth breakdown as CSV"""
    user = await get_current_user(request)
    accounts = await db.accounts.find({"user_id": user.user_id, "is_active": True}, {"_id": 0}).to_list(100)
    investments = await db.investments.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    credit_cards = await db.credit_cards.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    loans = await db.loans.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    lending = await db.lending.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["Category", "Item", "Type", "Amount"])
    for a in accounts:
        writer.writerow(["Asset - Account", a.get("name", ""), a.get("account_type", ""), a.get("balance", 0)])
    for i in investments:
        writer.writerow(["Asset - Investment", i.get("name", ""), i.get("investment_type", ""), i.get("current_value", 0)])
    for l in lending:
        if l.get("lending_type") == "lent" and not l.get("is_settled"):
            writer.writerow(["Asset - Money Lent", l.get("person_name", ""), "lent", l.get("remaining_amount", l.get("amount", 0))])
    for c in credit_cards:
        writer.writerow(["Liability - Credit Card", c.get("name", ""), "credit_card", c.get("current_outstanding", 0)])
    for lo in loans:
        writer.writerow(["Liability - Loan", lo.get("name", ""), lo.get("loan_type", ""), lo.get("outstanding_amount", 0)])
    for l in lending:
        if l.get("lending_type") == "borrowed" and not l.get("is_settled"):
            writer.writerow(["Liability - Borrowed", l.get("person_name", ""), "borrowed", l.get("remaining_amount", l.get("amount", 0))])
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=networth.csv"})


# ==================== EXPORT ENDPOINT ====================

@api_router.get("/export")
async def export_data(
    request: Request,
    authorization: Optional[str] = Header(None),
    format: str = "json"
):
    """Export all user data"""
    user = await get_current_user(request)
    
    # Get all user data
    bills = await db.bills.find({"user_id": user.user_id}, {"_id": 0}).to_list(10000)
    payments = await db.payments.find({"user_id": user.user_id}, {"_id": 0}).to_list(10000)
    categories = await db.categories.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    budgets = await db.budgets.find({"user_id": user.user_id}, {"_id": 0}).to_list(1000)
    accounts = await db.accounts.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    incomes = await db.income.find({"user_id": user.user_id}, {"_id": 0}).to_list(10000)
    expenses = await db.expenses.find({"user_id": user.user_id}, {"_id": 0}).to_list(10000)
    family_members = await db.family_members.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    settings = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    
    export_data = {
        "user": user.dict(),
        "accounts": accounts,
        "income": incomes,
        "expenses": expenses,
        "bills": bills,
        "payments": payments,
        "categories": categories,
        "budgets": budgets,
        "family_members": family_members,
        "settings": settings,
        "exported_at": datetime.now(timezone.utc).isoformat()
    }
    
    return export_data

# Include router and add middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
