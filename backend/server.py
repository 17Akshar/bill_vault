from fastapi import FastAPI, APIRouter, HTTPException, Header, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import logging
import uuid
import bcrypt
import jwt
import httpx

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
    source: str
    date: datetime
    notes: Optional[str] = None
    created_at: datetime

class IncomeCreate(BaseModel):
    account_id: str
    amount: float
    category: str
    source: str
    date: str
    notes: Optional[str] = None
    family_member_id: Optional[str] = None

class IncomeUpdate(BaseModel):
    account_id: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
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
    payment_type: str  # cash, bank, credit_card, upi
    description: str
    date: datetime
    notes: Optional[str] = None
    created_at: datetime

class ExpenseCreate(BaseModel):
    account_id: str
    amount: float
    category: str
    payment_type: str
    description: str
    date: str
    notes: Optional[str] = None
    family_member_id: Optional[str] = None

class ExpenseUpdate(BaseModel):
    account_id: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
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
    interest_rate: float = 0.0
    family_member_id: Optional[str] = None

class CreditCardUpdate(BaseModel):
    name: Optional[str] = None
    credit_limit: Optional[float] = None
    current_outstanding: Optional[float] = None
    billing_date: Optional[int] = None
    due_date: Optional[int] = None
    interest_rate: Optional[float] = None

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

class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    current_value: Optional[float] = None
    maturity_date: Optional[str] = None
    notes: Optional[str] = None

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
        "due_date": data.due_date, "interest_rate": data.interest_rate,
        "family_member_id": data.family_member_id, "is_active": True,
        "created_at": now, "updated_at": now
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
