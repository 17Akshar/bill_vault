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

class Bill(BaseModel):
    bill_id: str
    user_id: str
    name: str
    amount: float
    currency: str = "USD"
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
    currency: str = "USD"
    due_date: str
    category: str
    vendor: Optional[str] = None
    notes: Optional[str] = None
    receipt_image: Optional[str] = None
    is_recurring: bool = False
    recurrence_type: Optional[str] = None
    recurrence_interval: Optional[int] = 1

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
    settings = await db.user_settings.find_one({"user_id": user.user_id}, {"_id": 0})
    
    export_data = {
        "user": user.dict(),
        "bills": bills,
        "payments": payments,
        "categories": categories,
        "budgets": budgets,
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
