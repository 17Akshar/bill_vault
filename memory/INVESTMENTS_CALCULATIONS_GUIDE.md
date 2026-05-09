# Investments Calculations Documentation

## Overview
Comprehensive calculation utilities for portfolio analytics, gain/loss tracking, and asset allocation.

---

## Available Calculations

### 1. Total Portfolio Value
**Function:** `calculate_total_portfolio_value(investments)`

**Returns:**
```python
{
    "total_invested": 2500000.0,
    "total_current_value": 2875000.0,
    "total_gain_loss": 375000.0,
    "gain_loss_percentage": 15.0
}
```

**Usage:**
```python
from investments_calculations import InvestmentCalculations

calc = InvestmentCalculations()
portfolio = calc.calculate_total_portfolio_value(investments)
```

---

### 2. Investment Gain/Loss
**Function:** `calculate_investment_gain_loss(invested_amount, current_value)`

**Returns:**
```python
{
    "gain_loss": 119000.0,
    "gain_loss_percentage": 33.43
}
```

**Usage:**
```python
gains = calc.calculate_investment_gain_loss(356000, 475000)
```

---

### 3. Asset Allocation
**Function:** `calculate_asset_allocation(investments)`

**Returns:**
```python
{
    "total_portfolio_value": 2875000.0,
    "by_type": [
        {
            "type": "stocks",
            "value": 1620000.0,
            "percentage": 56.35
        },
        {
            "type": "mutual_funds",
            "value": 620000.0,
            "percentage": 21.57
        }
        # ... more types
    ],
    "by_group": [
        {
            "group": "market",
            "value": 2285000.0,
            "percentage": 79.48
        },
        {
            "group": "fixed_income",
            "value": 390000.0,
            "percentage": 13.57
        }
        # ... more groups
    ]
}
```

**Usage:**
```python
allocation = calc.calculate_asset_allocation(investments)
```

---

### 4. Average Buy Price
**Function:** `calculate_average_buy_price(transactions)`

**Returns:** `float` - Weighted average buy price

**Usage:**
```python
avg_price = calc.calculate_average_buy_price(transactions)
# Returns: 2845.67
```

---

### 5. Realized vs Unrealized Gains
**Function:** `calculate_realized_unrealized_gains(investment, transactions)`

**Returns:**
```python
{
    "realized_gain_loss": 50000.0,    # From sold positions
    "unrealized_gain_loss": 69000.0   # From current holdings
}
```

**Usage:**
```python
gains = calc.calculate_realized_unrealized_gains(investment, transactions)
```

---

### 6. Investment Summary
**Function:** `calculate_investment_summary(investments, transactions)`

**Returns:**
```python
{
    "portfolio": {
        "total_invested": 2500000.0,
        "total_current_value": 2875000.0,
        "total_gain_loss": 375000.0,
        "gain_loss_percentage": 15.0
    },
    "allocation": {
        "by_type": [...],
        "by_group": [...]
    },
    "counts": {
        "total": 50,
        "active": 45,
        "closed": 3,
        "matured": 2,
        "partially_sold": 0
    },
    "transaction_counts": {
        "total": 150,
        "buy": 80,
        "sell": 30,
        "dividend": 35,
        "charges": 5
    },
    "total_dividends_received": 45000.0,
    "total_charges_paid": 8500.0,
    "net_gain_loss": 411500.0  # Includes dividends, excludes charges
}
```

---

### 7. Top Performers
**Function:** `calculate_top_performers(investments, limit=5)`

**Returns:** List of top performing investments sorted by gain percentage

**Usage:**
```python
top_5 = calc.calculate_top_performers(investments, limit=5)
```

---

### 8. Top Losers
**Function:** `calculate_top_losers(investments, limit=5)`

**Returns:** List of worst performing investments sorted by loss percentage

**Usage:**
```python
bottom_5 = calc.calculate_top_losers(investments, limit=5)
```

---

### 9. XIRR Calculation
**Function:** `calculate_xirr(transactions, current_value)`

**Returns:** `float` - Extended Internal Rate of Return as percentage

**Usage:**
```python
xirr = calc.calculate_xirr(transactions, current_value)
# Returns: 18.45
```

**Note:** Uses simplified approximation for annualized return

---

### 10. Portfolio Diversity Score
**Function:** `calculate_portfolio_diversity_score(investments)`

**Returns:**
```python
{
    "score": 75,              # 0-100
    "level": "Good",          # Excellent/Good/Moderate/Low/Very Low
    "unique_types": 8,
    "total_investments": 45,
    "recommendation": "Consider adding more investment types"
}
```

**Scoring:**
- 80-100: Excellent
- 60-79: Good
- 40-59: Moderate
- 20-39: Low
- 0-19: Very Low

---

## API Endpoints

### GET /api/investments/dashboard
Returns comprehensive portfolio summary with calculations.

**Response:**
```json
{
  "total_invested": 2500000,
  "total_current_value": 2875000,
  "total_gain_loss": 375000,
  "gain_loss_percentage": 15.0,
  "by_type": [...],
  "by_group": [...],
  "asset_allocation": {...},
  "diversity_score": {...},
  "top_performers": [...],
  "top_losers": [...],
  "total_dividends_received": 45000,
  "total_charges_paid": 8500,
  "net_gain_loss": 411500
}
```

---

### GET /api/investments/analytics/summary
Returns detailed analytics with top performers/losers.

**Response:**
```json
{
  "portfolio_summary": {
    "portfolio": {...},
    "allocation": {...},
    "counts": {...}
  },
  "diversity": {...},
  "top_performers": [...],
  "top_losers": [...]
}
```

---

## Calculation Formulas

### Gain/Loss
```
gain_loss = current_value - invested_amount
gain_loss_percentage = (gain_loss / invested_amount) × 100
```

### Average Buy Price (Weighted)
```
total_amount = Σ(quantity × price) for all buy transactions
total_quantity = Σ(quantity) for all buy transactions
average_buy_price = total_amount / total_quantity
```

### Asset Allocation Percentage
```
type_percentage = (type_value / total_portfolio_value) × 100
```

### Diversity Score
```
type_score = min(unique_types × 10, 50)
distribution_score = (1 - Herfindahl_index) × 100
diversity_score = type_score + min(distribution_score, 50)

where Herfindahl_index = Σ(share²) for each investment
```

### XIRR (Simplified)
```
total_invested = Σ(buy_amounts)
total_returned = current_value + Σ(sell_amounts + dividends)
total_return = (total_returned - total_invested) / total_invested
years = (last_date - first_date) / 365.25
xirr = (1 + total_return)^(1/years) - 1
```

### Net Gain/Loss
```
net_gain_loss = total_gain_loss + total_dividends - total_charges
```

---

## Usage Examples

### Frontend Integration

```typescript
// Get portfolio summary
const response = await api.get('/investments/dashboard');
const { 
  total_invested, 
  total_current_value, 
  total_gain_loss,
  gain_loss_percentage,
  asset_allocation,
  diversity_score 
} = response.data;

// Display portfolio value
console.log(`Portfolio Value: ${formatINR(total_current_value)}`);
console.log(`Total Gain: ${formatINR(total_gain_loss)} (${gain_loss_percentage}%)`);

// Show asset allocation
asset_allocation.by_type.forEach(type => {
  console.log(`${type.type}: ${type.percentage}%`);
});

// Display diversity
console.log(`Diversity: ${diversity_score.level} (${diversity_score.score}/100)`);
```

### Backend Usage

```python
from investments_calculations import InvestmentCalculations, get_portfolio_summary

# Get all investments
investments = await db.investments.find({"user_id": user_id}).to_list(1000)
transactions = await db.investment_transactions.find({"user_id": user_id}).to_list(5000)

# Quick summary
summary = get_portfolio_summary(investments, transactions)

# Detailed calculations
calc = InvestmentCalculations()

# Portfolio value
portfolio = calc.calculate_total_portfolio_value(investments)

# Asset allocation
allocation = calc.calculate_asset_allocation(investments)

# Top performers
top_5 = calc.calculate_top_performers(investments, limit=5)

# Diversity
diversity = calc.calculate_portfolio_diversity_score(investments)
```

---

## Performance Considerations

### Optimization Tips
1. **Cache Results:** Cache portfolio summary for 5-10 minutes
2. **Batch Queries:** Fetch all investments and transactions in single queries
3. **Indexes:** Ensure proper indexes on user_id, investment_type, status
4. **Denormalization:** Store calculated fields (gain_loss, gain_loss_percentage) in documents

### Typical Performance
- Portfolio calculation: ~50-100ms for 100 investments
- Asset allocation: ~30-50ms for 100 investments
- Diversity score: ~20-30ms for 100 investments
- XIRR calculation: ~100-200ms for 1000 transactions

---

## Testing

### Unit Tests
```python
def test_portfolio_calculation():
    investments = [
        {"invested_amount": 100000, "current_value": 120000, "is_active": True, "status": "active"},
        {"invested_amount": 50000, "current_value": 55000, "is_active": True, "status": "active"}
    ]
    
    calc = InvestmentCalculations()
    result = calc.calculate_total_portfolio_value(investments)
    
    assert result["total_invested"] == 150000
    assert result["total_current_value"] == 175000
    assert result["total_gain_loss"] == 25000
    assert result["gain_loss_percentage"] == 16.67
```

---

## Notes

1. **Active Investments Only:** Most calculations filter for `is_active=True` and `status='active'`
2. **Precision:** All monetary values rounded to 2 decimal places
3. **Zero Division:** Handled gracefully - returns 0 when denominator is 0
4. **Currency:** All amounts in INR (Indian Rupees)
5. **Date Format:** Uses ISO 8601 format for dates
6. **Transaction Types:** buy, sell, dividend, charges, bonus, split
7. **Status Values:** active, closed, matured, partially_sold

---

## Future Enhancements

- Real XIRR calculation using Newton-Raphson method
- Time-weighted return (TWR) calculation
- Sharpe ratio for risk-adjusted returns
- Compound Annual Growth Rate (CAGR)
- Benchmark comparison (vs Nifty/Sensex)
- Tax calculation (LTCG/STCG)
- Sector-wise allocation
- Risk assessment score

---

**File:** `/app/backend/investments_calculations.py`
**Last Updated:** December 2024
**Version:** 1.0
