from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)

# Category Model
class Category(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    name: str
    icon: str
    type: str = "expense"  # expense or income
    is_custom: bool = False
    default_budget: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class CategoryCreate(BaseModel):
    name: str
    icon: str
    type: str = "expense"
    default_budget: float = 0.0

# Budget Model
class Budget(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = "default_user"  # For multi-user support later
    total_budget: float
    period: str = "monthly"  # monthly, yearly, custom
    start_date: datetime
    currency: str = "USD"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class BudgetCreate(BaseModel):
    total_budget: float
    period: str = "monthly"
    start_date: datetime
    currency: str = "USD"

class BudgetUpdate(BaseModel):
    total_budget: Optional[float] = None
    period: Optional[str] = None
    start_date: Optional[datetime] = None
    currency: Optional[str] = None

# CategoryBudget Model
class CategoryBudget(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = "default_user"
    category_name: str
    category_icon: str
    budget_amount: float
    spent: float = 0.0
    period: str = "monthly"
    alert_limit: float = 80.0  # Percentage
    notes: Optional[str] = None
    month: int  # 1-12
    year: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class CategoryBudgetCreate(BaseModel):
    category_name: str
    category_icon: str
    budget_amount: float
    period: str = "monthly"
    alert_limit: float = 80.0
    notes: Optional[str] = None
    month: int
    year: int

class CategoryBudgetUpdate(BaseModel):
    budget_amount: Optional[float] = None
    alert_limit: Optional[float] = None
    notes: Optional[str] = None
    spent: Optional[float] = None

# SavingsGoal Model
class SavingsGoal(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = "default_user"
    goal_amount: float
    current_amount: float = 0.0
    target_date: date
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str, date: lambda v: v.isoformat()}

class SavingsGoalCreate(BaseModel):
    goal_amount: float
    target_date: date
    notes: Optional[str] = None

class SavingsGoalUpdate(BaseModel):
    goal_amount: Optional[float] = None
    current_amount: Optional[float] = None
    target_date: Optional[date] = None
    notes: Optional[str] = None

# Transaction Model
class Transaction(BaseModel):
    id: Optional[str] = Field(default=None, alias="_id")
    user_id: str = "default_user"
    amount: float
    category: str
    type: str = "expense"  # expense or income
    date: datetime
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class TransactionCreate(BaseModel):
    amount: float
    category: str
    type: str = "expense"
    date: datetime
    description: Optional[str] = None

class BudgetSummary(BaseModel):
    total_budget: float
    total_spent: float
    remaining_budget: float
    income: float
    expenses: float
    savings: float
    savings_rate: float
    categories: List[dict]
    month: int
    year: int
    currency: str

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Fincare Budget API", "version": "1.0.0"}

# ========== Category Routes ==========

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    """Get all categories (default + custom)"""
    categories = await db.categories.find().to_list(100)
    return [Category(**{**cat, "_id": str(cat["_id"])}) for cat in categories]

@api_router.post("/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    """Create a custom category"""
    category_dict = category.dict()
    category_dict["is_custom"] = True
    category_dict["created_at"] = datetime.utcnow()
    
    result = await db.categories.insert_one(category_dict)
    created_category = await db.categories.find_one({"_id": result.inserted_id})
    return Category(**{**created_category, "_id": str(created_category["_id"])})

@api_router.post("/categories/seed")
async def seed_categories():
    """Seed default categories"""
    default_categories = [
        {"name": "Home", "icon": "home", "type": "expense", "is_custom": False, "default_budget": 20000},
        {"name": "Food & Dining", "icon": "restaurant", "type": "expense", "is_custom": False, "default_budget": 10000},
        {"name": "Transport", "icon": "car", "type": "expense", "is_custom": False, "default_budget": 10000},
        {"name": "Shopping", "icon": "shopping-bag", "type": "expense", "is_custom": False, "default_budget": 5000},
        {"name": "Entertainment", "icon": "film", "type": "expense", "is_custom": False, "default_budget": 3000},
        {"name": "Travel", "icon": "airplane", "type": "expense", "is_custom": False, "default_budget": 5000},
        {"name": "Investments", "icon": "trending-up", "type": "expense", "is_custom": False, "default_budget": 15000},
        {"name": "Health", "icon": "heart", "type": "expense", "is_custom": False, "default_budget": 3000},
        {"name": "Education", "icon": "book", "type": "expense", "is_custom": False, "default_budget": 2000},
        {"name": "Others", "icon": "more-horizontal", "type": "expense", "is_custom": False, "default_budget": 2000},
    ]
    
    # Check if categories already exist
    existing = await db.categories.count_documents({})
    if existing == 0:
        for cat in default_categories:
            cat["created_at"] = datetime.utcnow()
        await db.categories.insert_many(default_categories)
        return {"message": f"Seeded {len(default_categories)} default categories"}
    return {"message": "Categories already exist"}

# ========== Budget Routes ==========

@api_router.get("/budget", response_model=Budget)
async def get_budget():
    """Get current budget settings"""
    budget = await db.budgets.find_one({"user_id": "default_user"})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    return Budget(**{**budget, "_id": str(budget["_id"])})

@api_router.post("/budget", response_model=Budget)
async def create_or_update_budget(budget: BudgetCreate):
    """Create or update budget settings"""
    budget_dict = budget.dict()
    budget_dict["user_id"] = "default_user"
    budget_dict["updated_at"] = datetime.utcnow()
    
    existing = await db.budgets.find_one({"user_id": "default_user"})
    if existing:
        budget_dict["created_at"] = existing["created_at"]
        await db.budgets.update_one(
            {"user_id": "default_user"},
            {"$set": budget_dict}
        )
        updated_budget = await db.budgets.find_one({"user_id": "default_user"})
        return Budget(**{**updated_budget, "_id": str(updated_budget["_id"])})
    else:
        budget_dict["created_at"] = datetime.utcnow()
        result = await db.budgets.insert_one(budget_dict)
        created_budget = await db.budgets.find_one({"_id": result.inserted_id})
        return Budget(**{**created_budget, "_id": str(created_budget["_id"])})

# ========== CategoryBudget Routes ==========

@api_router.get("/category-budgets", response_model=List[CategoryBudget])
async def get_category_budgets(month: int, year: int):
    """Get category budgets for a specific month/year"""
    budgets = await db.category_budgets.find({
        "user_id": "default_user",
        "month": month,
        "year": year
    }).to_list(100)
    return [CategoryBudget(**{**b, "_id": str(b["_id"])}) for b in budgets]

@api_router.post("/category-budgets", response_model=CategoryBudget)
async def create_category_budget(budget: CategoryBudgetCreate):
    """Create a category budget"""
    # Check if already exists
    existing = await db.category_budgets.find_one({
        "user_id": "default_user",
        "category_name": budget.category_name,
        "month": budget.month,
        "year": budget.year
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Budget for this category already exists for this month")
    
    budget_dict = budget.dict()
    budget_dict["user_id"] = "default_user"
    budget_dict["spent"] = 0.0
    budget_dict["created_at"] = datetime.utcnow()
    budget_dict["updated_at"] = datetime.utcnow()
    
    result = await db.category_budgets.insert_one(budget_dict)
    created_budget = await db.category_budgets.find_one({"_id": result.inserted_id})
    return CategoryBudget(**{**created_budget, "_id": str(created_budget["_id"])})

@api_router.put("/category-budgets/{budget_id}", response_model=CategoryBudget)
async def update_category_budget(budget_id: str, budget: CategoryBudgetUpdate):
    """Update a category budget"""
    if not ObjectId.is_valid(budget_id):
        raise HTTPException(status_code=400, detail="Invalid budget ID")
    
    update_data = {k: v for k, v in budget.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.category_budgets.update_one(
        {"_id": ObjectId(budget_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    updated_budget = await db.category_budgets.find_one({"_id": ObjectId(budget_id)})
    return CategoryBudget(**{**updated_budget, "_id": str(updated_budget["_id"])})

@api_router.delete("/category-budgets/{budget_id}")
async def delete_category_budget(budget_id: str):
    """Delete a category budget"""
    if not ObjectId.is_valid(budget_id):
        raise HTTPException(status_code=400, detail="Invalid budget ID")
    
    result = await db.category_budgets.delete_one({"_id": ObjectId(budget_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Budget not found")
    
    return {"message": "Budget deleted successfully"}

# ========== SavingsGoal Routes ==========

@api_router.get("/savings-goals", response_model=List[SavingsGoal])
async def get_savings_goals():
    """Get all savings goals"""
    goals = await db.savings_goals.find({"user_id": "default_user"}).to_list(100)
    return [SavingsGoal(**{**g, "_id": str(g["_id"])}) for g in goals]

@api_router.post("/savings-goals", response_model=SavingsGoal)
async def create_savings_goal(goal: SavingsGoalCreate):
    """Create a savings goal"""
    goal_dict = goal.dict()
    goal_dict["user_id"] = "default_user"
    goal_dict["current_amount"] = 0.0
    goal_dict["created_at"] = datetime.utcnow()
    goal_dict["updated_at"] = datetime.utcnow()
    # Convert date to datetime for MongoDB compatibility
    if isinstance(goal_dict["target_date"], date) and not isinstance(goal_dict["target_date"], datetime):
        goal_dict["target_date"] = datetime.combine(goal_dict["target_date"], datetime.min.time())
    
    result = await db.savings_goals.insert_one(goal_dict)
    created_goal = await db.savings_goals.find_one({"_id": result.inserted_id})
    return SavingsGoal(**{**created_goal, "_id": str(created_goal["_id"])})

@api_router.put("/savings-goals/{goal_id}", response_model=SavingsGoal)
async def update_savings_goal(goal_id: str, goal: SavingsGoalUpdate):
    """Update a savings goal"""
    if not ObjectId.is_valid(goal_id):
        raise HTTPException(status_code=400, detail="Invalid goal ID")
    
    update_data = {k: v for k, v in goal.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    # Convert date to datetime for MongoDB compatibility (BSON cannot encode datetime.date)
    if "target_date" in update_data and isinstance(update_data["target_date"], date) and not isinstance(update_data["target_date"], datetime):
        update_data["target_date"] = datetime.combine(update_data["target_date"], datetime.min.time())
    
    result = await db.savings_goals.update_one(
        {"_id": ObjectId(goal_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    updated_goal = await db.savings_goals.find_one({"_id": ObjectId(goal_id)})
    return SavingsGoal(**{**updated_goal, "_id": str(updated_goal["_id"])})

@api_router.delete("/savings-goals/{goal_id}")
async def delete_savings_goal(goal_id: str):
    """Delete a savings goal"""
    if not ObjectId.is_valid(goal_id):
        raise HTTPException(status_code=400, detail="Invalid goal ID")
    
    result = await db.savings_goals.delete_one({"_id": ObjectId(goal_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    return {"message": "Goal deleted successfully"}

# ========== Transaction Routes ==========

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[str] = None,
    type: Optional[str] = None
):
    """Get all transactions with optional filters"""
    query = {"user_id": "default_user"}
    
    # Add date range filter
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        if end_date:
            date_filter["$lte"] = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        query["date"] = date_filter
    
    # Add category filter
    if category:
        query["category"] = category
    
    # Add type filter
    if type:
        query["type"] = type
    
    transactions = await db.transactions.find(query).sort("date", -1).to_list(1000)
    return [Transaction(**{**t, "_id": str(t["_id"])}) for t in transactions]

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction: TransactionCreate):
    """Create a new transaction"""
    transaction_dict = transaction.dict()
    transaction_dict["user_id"] = "default_user"
    transaction_dict["created_at"] = datetime.utcnow()
    
    result = await db.transactions.insert_one(transaction_dict)
    created_transaction = await db.transactions.find_one({"_id": result.inserted_id})
    return Transaction(**{**created_transaction, "_id": str(created_transaction["_id"])})

@api_router.get("/transactions/{transaction_id}", response_model=Transaction)
async def get_transaction(transaction_id: str):
    """Get a specific transaction"""
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID")
    
    transaction = await db.transactions.find_one({"_id": ObjectId(transaction_id)})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return Transaction(**{**transaction, "_id": str(transaction["_id"])})

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str):
    """Delete a transaction"""
    if not ObjectId.is_valid(transaction_id):
        raise HTTPException(status_code=400, detail="Invalid transaction ID")
    
    result = await db.transactions.delete_one({"_id": ObjectId(transaction_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": "Transaction deleted successfully"}

# ========== Budget Summary Route ==========

@api_router.get("/budget-summary", response_model=BudgetSummary)
async def get_budget_summary(month: int, year: int):
    """Get comprehensive budget summary for a month with real transaction data"""
    # Get budget settings
    budget_settings = await db.budgets.find_one({"user_id": "default_user"})
    total_budget = budget_settings["total_budget"] if budget_settings else 0.0
    currency = budget_settings["currency"] if budget_settings else "USD"
    
    # Get category budgets
    category_budgets = await db.category_budgets.find({
        "user_id": "default_user",
        "month": month,
        "year": year
    }).to_list(100)
    
    # Calculate date range for the month
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
    
    # Get all transactions for this month
    transactions = await db.transactions.find({
        "user_id": "default_user",
        "date": {
            "$gte": start_date,
            "$lt": end_date
        }
    }).to_list(1000)
    
    # Calculate totals from transactions
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
    
    # Calculate category-wise spending from transactions
    category_spending = {}
    for transaction in transactions:
        if transaction["type"] == "expense":
            category = transaction["category"]
            category_spending[category] = category_spending.get(category, 0) + transaction["amount"]
    
    # Update category budgets with actual spending
    total_spent = 0.0
    categories_data = []
    
    for cb in category_budgets:
        # Get actual spent from transactions
        actual_spent = category_spending.get(cb["category_name"], 0.0)
        total_spent += actual_spent
        
        remaining = cb["budget_amount"] - actual_spent
        progress = (actual_spent / cb["budget_amount"] * 100) if cb["budget_amount"] > 0 else 0
        
        categories_data.append({
            "id": str(cb["_id"]),
            "category": cb["category_name"],
            "icon": cb["category_icon"],
            "budget": cb["budget_amount"],
            "spent": actual_spent,
            "remaining": remaining,
            "progress": round(progress, 2),
            "alert_limit": cb["alert_limit"]
        })
    
    # Calculate final values
    remaining_budget = total_budget - total_spent
    income = total_income if total_income > 0 else total_budget  # Use actual income or budget as fallback
    expenses = total_expenses
    savings = income - expenses
    savings_rate = (savings / income * 100) if income > 0 else 0
    
    return BudgetSummary(
        total_budget=total_budget,
        total_spent=total_spent,
        remaining_budget=remaining_budget,
        income=income,
        expenses=expenses,
        savings=savings,
        savings_rate=round(savings_rate, 2),
        categories=categories_data,
        month=month,
        year=year,
        currency=currency
    )

# ========== Import Budget Route ==========

@api_router.post("/import-budget")
async def import_budget(from_month: int, from_year: int, to_month: int, to_year: int):
    """Import category budgets from one month to another"""
    # Get source month budgets
    source_budgets = await db.category_budgets.find({
        "user_id": "default_user",
        "month": from_month,
        "year": from_year
    }).to_list(100)
    
    if not source_budgets:
        raise HTTPException(status_code=404, detail="No budgets found for the source month")
    
    # Check if target month already has budgets
    existing = await db.category_budgets.count_documents({
        "user_id": "default_user",
        "month": to_month,
        "year": to_year
    })
    
    if existing > 0:
        raise HTTPException(status_code=400, detail="Target month already has budgets")
    
    # Copy budgets to new month
    new_budgets = []
    for budget in source_budgets:
        new_budget = {
            "user_id": budget["user_id"],
            "category_name": budget["category_name"],
            "category_icon": budget["category_icon"],
            "budget_amount": budget["budget_amount"],
            "spent": 0.0,
            "period": budget["period"],
            "alert_limit": budget["alert_limit"],
            "notes": budget.get("notes"),
            "month": to_month,
            "year": to_year,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        new_budgets.append(new_budget)
    
    await db.category_budgets.insert_many(new_budgets)
    
    return {
        "message": f"Imported {len(new_budgets)} budgets from {from_month}/{from_year} to {to_month}/{to_year}"
    }

# ========== Budget Templates ==========

BUDGET_TEMPLATES = [
    {
        "id": "student",
        "name": "Student Saver",
        "description": "Tight budget with focus on essentials and education",
        "icon": "book",
        "color": "#6C63FF",
        "total_budget": 30000,
        "categories": [
            {"category_name": "Food & Dining", "category_icon": "restaurant", "budget_amount": 8000, "alert_limit": 80},
            {"category_name": "Transport", "category_icon": "car", "budget_amount": 4000, "alert_limit": 80},
            {"category_name": "Education", "category_icon": "book", "budget_amount": 10000, "alert_limit": 80},
            {"category_name": "Entertainment", "category_icon": "film", "budget_amount": 3000, "alert_limit": 80},
            {"category_name": "Others", "category_icon": "more-horizontal", "budget_amount": 5000, "alert_limit": 80},
        ],
    },
    {
        "id": "family",
        "name": "Family Plan",
        "description": "Comprehensive household budget for families",
        "icon": "users",
        "color": "#4CAF50",
        "total_budget": 100000,
        "categories": [
            {"category_name": "Home", "category_icon": "home", "budget_amount": 30000, "alert_limit": 80},
            {"category_name": "Food & Dining", "category_icon": "restaurant", "budget_amount": 20000, "alert_limit": 80},
            {"category_name": "Transport", "category_icon": "car", "budget_amount": 12000, "alert_limit": 80},
            {"category_name": "Health", "category_icon": "heart", "budget_amount": 8000, "alert_limit": 80},
            {"category_name": "Education", "category_icon": "book", "budget_amount": 15000, "alert_limit": 80},
            {"category_name": "Entertainment", "category_icon": "film", "budget_amount": 5000, "alert_limit": 80},
            {"category_name": "Shopping", "category_icon": "shopping-bag", "budget_amount": 10000, "alert_limit": 80},
        ],
    },
    {
        "id": "saver",
        "name": "Aggressive Saver",
        "description": "Minimal spending, maximum savings — 70%+ savings rate",
        "icon": "trending-up",
        "color": "#FF9800",
        "total_budget": 25000,
        "categories": [
            {"category_name": "Home", "category_icon": "home", "budget_amount": 10000, "alert_limit": 70},
            {"category_name": "Food & Dining", "category_icon": "restaurant", "budget_amount": 6000, "alert_limit": 70},
            {"category_name": "Transport", "category_icon": "car", "budget_amount": 3000, "alert_limit": 70},
            {"category_name": "Health", "category_icon": "heart", "budget_amount": 3000, "alert_limit": 80},
            {"category_name": "Others", "category_icon": "more-horizontal", "budget_amount": 3000, "alert_limit": 70},
        ],
    },
    {
        "id": "professional",
        "name": "Professional",
        "description": "Balanced lifestyle with investments and travel",
        "icon": "briefcase",
        "color": "#F44336",
        "total_budget": 75000,
        "categories": [
            {"category_name": "Home", "category_icon": "home", "budget_amount": 20000, "alert_limit": 80},
            {"category_name": "Food & Dining", "category_icon": "restaurant", "budget_amount": 12000, "alert_limit": 80},
            {"category_name": "Transport", "category_icon": "car", "budget_amount": 8000, "alert_limit": 80},
            {"category_name": "Investments", "category_icon": "trending-up", "budget_amount": 15000, "alert_limit": 80},
            {"category_name": "Travel", "category_icon": "airplane", "budget_amount": 5000, "alert_limit": 80},
            {"category_name": "Shopping", "category_icon": "shopping-bag", "budget_amount": 7000, "alert_limit": 80},
            {"category_name": "Entertainment", "category_icon": "film", "budget_amount": 4000, "alert_limit": 80},
            {"category_name": "Health", "category_icon": "heart", "budget_amount": 4000, "alert_limit": 80},
        ],
    },
]


class ApplyTemplateRequest(BaseModel):
    template_id: str
    month: int
    year: int
    overwrite: bool = False  # If True, replace existing category budgets for that month


@api_router.get("/budget/templates")
async def get_budget_templates():
    """List all available preset budget templates."""
    return BUDGET_TEMPLATES


@api_router.post("/budget/apply-template")
async def apply_budget_template(payload: ApplyTemplateRequest):
    """Apply a preset budget template to the given month/year.

    Creates category budgets for each category in the template. Skips categories
    that already have budgets for that month/year (unless overwrite=True).
    Also sets the user's total_budget to the template's total_budget.
    """
    template = next((t for t in BUDGET_TEMPLATES if t["id"] == payload.template_id), None)
    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{payload.template_id}' not found")

    if payload.month < 1 or payload.month > 12:
        raise HTTPException(status_code=400, detail="Month must be between 1 and 12")

    # Optionally clear existing budgets for that month
    if payload.overwrite:
        await db.category_budgets.delete_many({
            "user_id": "default_user",
            "month": payload.month,
            "year": payload.year,
        })

    # Get currently saved currency (preserve user's currency choice)
    existing_budget = await db.budgets.find_one({"user_id": "default_user"})
    currency = existing_budget["currency"] if existing_budget else "USD"

    # Update or create the total budget setting
    budget_dict = {
        "user_id": "default_user",
        "total_budget": float(template["total_budget"]),
        "period": "monthly",
        "start_date": datetime(payload.year, payload.month, 1),
        "currency": currency,
        "updated_at": datetime.utcnow(),
    }
    if existing_budget:
        budget_dict["created_at"] = existing_budget["created_at"]
        await db.budgets.update_one({"user_id": "default_user"}, {"$set": budget_dict})
    else:
        budget_dict["created_at"] = datetime.utcnow()
        await db.budgets.insert_one(budget_dict)

    # Insert category budgets, skipping duplicates
    created = []
    skipped = []
    for cat in template["categories"]:
        exists = await db.category_budgets.find_one({
            "user_id": "default_user",
            "category_name": cat["category_name"],
            "month": payload.month,
            "year": payload.year,
        })
        if exists:
            skipped.append(cat["category_name"])
            continue
        new_doc = {
            "user_id": "default_user",
            "category_name": cat["category_name"],
            "category_icon": cat["category_icon"],
            "budget_amount": float(cat["budget_amount"]),
            "spent": 0.0,
            "period": "monthly",
            "alert_limit": float(cat.get("alert_limit", 80)),
            "notes": f"Applied from template: {template['name']}",
            "month": payload.month,
            "year": payload.year,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        result = await db.category_budgets.insert_one(new_doc)
        new_doc["_id"] = str(result.inserted_id)
        created.append(new_doc["category_name"])

    return {
        "message": f"Applied template '{template['name']}'",
        "template_id": template["id"],
        "template_name": template["name"],
        "total_budget": template["total_budget"],
        "currency": currency,
        "month": payload.month,
        "year": payload.year,
        "created_count": len(created),
        "skipped_count": len(skipped),
        "created": created,
        "skipped": skipped,
    }

# Include the router in the main app
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
