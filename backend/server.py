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

# Transaction Model (for future)
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

# ========== Budget Summary Route ==========

@api_router.get("/budget-summary", response_model=BudgetSummary)
async def get_budget_summary(month: int, year: int):
    """Get comprehensive budget summary for a month"""
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
    
    # Calculate totals
    total_spent = sum(cb["spent"] for cb in category_budgets)
    remaining_budget = total_budget - total_spent
    
    # For now, we'll use placeholder values for income
    # In a real app, this would come from transaction data
    income = total_budget  # Placeholder
    expenses = total_spent
    savings = income - expenses
    savings_rate = (savings / income * 100) if income > 0 else 0
    
    # Format category data
    categories_data = []
    for cb in category_budgets:
        remaining = cb["budget_amount"] - cb["spent"]
        progress = (cb["spent"] / cb["budget_amount"] * 100) if cb["budget_amount"] > 0 else 0
        categories_data.append({
            "id": str(cb["_id"]),
            "category": cb["category_name"],
            "icon": cb["category_icon"],
            "budget": cb["budget_amount"],
            "spent": cb["spent"],
            "remaining": remaining,
            "progress": round(progress, 2),
            "alert_limit": cb["alert_limit"]
        })
    
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
