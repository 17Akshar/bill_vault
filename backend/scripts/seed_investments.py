"""
Seed realistic investment + transaction data for the single-user account.

Usage:
    python /app/backend/scripts/seed_investments.py
"""
import asyncio
import sys
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Ensure /app/backend is on sys.path so we can import firebase_config directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from firebase_config import db  # noqa: E402

USER_ID = "user_60e1e8b7a649"  # single-user-mode user ID


def _iso_days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


SEED_INVESTMENTS = [
    # === STOCKS ===
    {
        "name": "Reliance Industries",
        "investment_type": "stocks",
        "invested_amount": 356000,
        "current_value": 475000,
        "purchase_date": _iso_days_ago(500),
        "type_specific_data": {
            "ticker": "RELIANCE.NS",
            "exchange": "NSE",
            "sector": "Energy",
            "quantity": 112,
            "average_buy_price": 3178.57,
            "current_price": 4241.07,
        },
    },
    {
        "name": "TCS Consultancy",
        "investment_type": "stocks",
        "invested_amount": 230000,
        "current_value": 264000,
        "purchase_date": _iso_days_ago(400),
        "type_specific_data": {
            "ticker": "TCS.NS",
            "exchange": "NSE",
            "sector": "IT",
            "quantity": 64,
            "average_buy_price": 3593.75,
            "current_price": 4125.00,
        },
    },
    {
        "name": "HDFC Bank",
        "investment_type": "stocks",
        "invested_amount": 220000,
        "current_value": 264000,
        "purchase_date": _iso_days_ago(300),
        "type_specific_data": {
            "ticker": "HDFCBANK.NS",
            "exchange": "NSE",
            "sector": "Banking",
            "quantity": 150,
            "average_buy_price": 1466.67,
            "current_price": 1760.00,
        },
    },
    {
        "name": "Infosys Ltd.",
        "investment_type": "stocks",
        "invested_amount": 191000,
        "current_value": 216000,
        "purchase_date": _iso_days_ago(250),
        "type_specific_data": {
            "ticker": "INFY.NS",
            "exchange": "NSE",
            "sector": "IT",
            "quantity": 45,
            "average_buy_price": 4244.44,
            "current_price": 4800.00,
        },
    },
    {
        "name": "ITC Ltd.",
        "investment_type": "stocks",
        "invested_amount": 80000,
        "current_value": 75000,
        "purchase_date": _iso_days_ago(180),
        "type_specific_data": {
            "ticker": "ITC.NS",
            "exchange": "NSE",
            "sector": "FMCG",
            "quantity": 200,
            "average_buy_price": 400.00,
            "current_price": 375.00,
        },
    },
    # === MUTUAL FUNDS ===
    {
        "name": "Axis Bluechip Fund",
        "investment_type": "mutual_funds",
        "invested_amount": 250000,
        "current_value": 320000,
        "purchase_date": _iso_days_ago(720),
        "type_specific_data": {
            "fund_house": "Axis Mutual Fund",
            "scheme_type": "Equity - Large Cap",
            "units": 5234.12,
            "nav": 61.13,
        },
    },
    {
        "name": "Mirae Asset Emerging Bluechip",
        "investment_type": "mutual_funds",
        "invested_amount": 225000,
        "current_value": 300000,
        "purchase_date": _iso_days_ago(600),
        "type_specific_data": {
            "fund_house": "Mirae Asset",
            "scheme_type": "Equity - Large & Mid Cap",
            "units": 2890.45,
            "nav": 103.79,
        },
    },
    # === ETF ===
    {
        "name": "Nippon India ETF Nifty 50",
        "investment_type": "etf",
        "invested_amount": 225000,
        "current_value": 245000,
        "purchase_date": _iso_days_ago(450),
        "type_specific_data": {
            "ticker": "NIFTYBEES",
            "exchange": "NSE",
            "quantity": 1000,
            "average_buy_price": 225.0,
            "current_price": 245.0,
        },
    },
    # === FIXED DEPOSIT ===
    {
        "name": "HDFC Bank FD - 5 Year",
        "investment_type": "fd",
        "invested_amount": 250000,
        "current_value": 271875,
        "purchase_date": _iso_days_ago(365),
        "maturity_date": datetime.now(timezone.utc) + timedelta(days=365 * 4),
        "type_specific_data": {
            "bank": "HDFC Bank",
            "interest_rate": 7.0,
            "tenure_months": 60,
            "compounding": "quarterly",
        },
    },
    # === GOLD ===
    {
        "name": "Sovereign Gold Bonds 2023",
        "investment_type": "gold",
        "invested_amount": 182000,
        "current_value": 195000,
        "purchase_date": _iso_days_ago(300),
        "type_specific_data": {
            "form": "SGB",
            "weight_grams": 30,
            "purchase_price_per_gram": 6066.67,
            "current_price_per_gram": 6500.00,
        },
    },
    # === PPF ===
    {
        "name": "SBI PPF Account",
        "investment_type": "ppf",
        "invested_amount": 56000,
        "current_value": 60000,
        "purchase_date": _iso_days_ago(800),
        "maturity_date": datetime.now(timezone.utc) + timedelta(days=365 * 13),
        "type_specific_data": {
            "bank": "State Bank of India",
            "interest_rate": 7.1,
            "annual_contribution": 12000,
        },
    },
    # === NPS ===
    {
        "name": "NPS Tier 1 - HDFC Pension Fund",
        "investment_type": "nps",
        "invested_amount": 42000,
        "current_value": 45000,
        "purchase_date": _iso_days_ago(600),
        "type_specific_data": {
            "tier": "Tier 1",
            "fund_manager": "HDFC Pension Fund",
            "asset_allocation": "75% Equity, 25% Debt",
        },
    },
    # === EPF ===
    {
        "name": "EPF Account",
        "investment_type": "epf",
        "invested_amount": 25000,
        "current_value": 26500,
        "purchase_date": _iso_days_ago(900),
        "type_specific_data": {
            "company": "Tech Mahindra",
            "interest_rate": 8.15,
        },
    },
]


SEED_TRANSACTIONS_PER_NAME = {
    "Reliance Industries": [
        {"transaction_type": "buy", "amount": 106000, "quantity": 50, "price_per_unit": 2120.00, "days_ago": 500},
        {"transaction_type": "buy", "amount": 81000, "quantity": 30, "price_per_unit": 2700.00, "days_ago": 380},
        {"transaction_type": "buy", "amount": 91200, "quantity": 32, "price_per_unit": 2850.00, "days_ago": 200},
        {"transaction_type": "dividend", "amount": 2016, "quantity": 112, "price_per_unit": 18.00, "days_ago": 30},
    ],
    "TCS Consultancy": [
        {"transaction_type": "buy", "amount": 230000, "quantity": 64, "price_per_unit": 3593.75, "days_ago": 400},
        {"transaction_type": "dividend", "amount": 2240, "quantity": 64, "price_per_unit": 35.00, "days_ago": 60},
    ],
    "HDFC Bank": [
        {"transaction_type": "buy", "amount": 220000, "quantity": 150, "price_per_unit": 1466.67, "days_ago": 300},
    ],
    "Axis Bluechip Fund": [
        {"transaction_type": "buy", "amount": 50000, "quantity": 1234.12, "price_per_unit": 40.51, "days_ago": 720},
        {"transaction_type": "buy", "amount": 200000, "quantity": 4000.00, "price_per_unit": 50.00, "days_ago": 365},
    ],
}


async def clear_existing():
    print("Clearing existing investments + transactions for user...")
    cursor = db.investments.find({"user_id": USER_ID}, {"_id": 0})
    existing = await cursor.to_list(1000)
    for inv in existing:
        await db.investments.delete_one({"investment_id": inv["investment_id"]})
    cursor2 = db.investment_transactions.find({"user_id": USER_ID}, {"_id": 0})
    txns = await cursor2.to_list(5000)
    for t in txns:
        await db.investment_transactions.delete_one({"transaction_id": t["transaction_id"]})
    print(f"  deleted {len(existing)} investments and {len(txns)} transactions")


async def seed():
    await clear_existing()
    name_to_inv_id: dict[str, str] = {}
    print("Inserting investments...")
    for spec in SEED_INVESTMENTS:
        inv_id = f"inv_{uuid.uuid4().hex[:12]}"
        doc = {
            "investment_id": inv_id,
            "user_id": USER_ID,
            "name": spec["name"],
            "investment_type": spec["investment_type"],
            "invested_amount": float(spec["invested_amount"]),
            "current_value": float(spec["current_value"]),
            "purchase_date": spec["purchase_date"],
            "maturity_date": spec.get("maturity_date"),
            "status": "active",
            "family_member_id": None,
            "notes": None,
            "documents": [],
            "linked_account": None,
            "type_specific_data": spec.get("type_specific_data", {}),
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        await db.investments.insert_one(doc)
        name_to_inv_id[spec["name"]] = inv_id
        print(f"  + {spec['name']} ({spec['investment_type']}): ₹{spec['invested_amount']} → ₹{spec['current_value']}")

    print("Inserting transactions...")
    for name, txns in SEED_TRANSACTIONS_PER_NAME.items():
        inv_id = name_to_inv_id.get(name)
        if not inv_id:
            continue
        for txn in txns:
            txn_id = f"txn_{uuid.uuid4().hex[:12]}"
            doc = {
                "transaction_id": txn_id,
                "investment_id": inv_id,
                "user_id": USER_ID,
                "transaction_type": txn["transaction_type"],
                "amount": float(txn["amount"]),
                "total_amount": float(txn["amount"]),  # used by calculations module
                "quantity": float(txn["quantity"]),
                "price_per_unit": float(txn["price_per_unit"]),
                "transaction_date": _iso_days_ago(txn["days_ago"]),
                "notes": None,
                "brokerage_charges": 0,
                "created_at": datetime.now(timezone.utc),
            }
            await db.investment_transactions.insert_one(doc)
            print(f"    {name} - {txn['transaction_type']} {txn['quantity']} @ {txn['price_per_unit']}")

    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
