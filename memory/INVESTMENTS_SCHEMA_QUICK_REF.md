# Investments Database Schema - Quick Reference

## Collections Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     INVESTMENTS MODULE                        │
└──────────────────────────────────────────────────────────────┘

┌─────────────────┐
│     USERS       │ (Existing - Reused)
│  (Auth System)  │
└────────┬────────┘
         │
         │ user_id (1:N)
         ▼
┌─────────────────────────┐
│     INVESTMENTS         │ ◄─── Main Collection
│  - investment_id (PK)   │
│  - user_id (FK)         │
│  - investment_name      │
│  - investment_type      │
│  - invested_amount      │
│  - current_value        │
│  - quantity             │
│  - gain_loss            │
│  - status               │
│  - notes                │
└────┬──────────┬─────────┘
     │          │
     │          │ category_id (N:1)
     │          ▼
     │    ┌───────────────────────┐
     │    │ INVESTMENT_CATEGORIES │
     │    │  - category_id (PK)   │
     │    │  - category_name      │
     │    │  - icon, color        │
     │    │  - configuration      │
     │    └───────────────────────┘
     │
     │ investment_id (1:N)
     ├──────────────────────┬──────────────────────┐
     ▼                      ▼                      ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ TRANSACTIONS │  │ PERFORMANCE  │  │   ALERTS     │
│ - txn_id(PK) │  │ - perf_id(PK)│  │ -alert_id(PK)│
│ - inv_id(FK) │  │ - inv_id(FK) │  │ - inv_id(FK) │
│ - type       │  │ - snapshot   │  │ - type       │
│ - amount     │  │ - returns    │  │ - condition  │
│ - date       │  │ - date       │  │ - status     │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Table Summary

### 1. Investments (Main Table)
- **Records:** Individual investments
- **Count:** ~100-1000 per user
- **Key Fields:** name, type, amount, value, quantity, status
- **Purpose:** Core investment portfolio data

### 2. InvestmentTransactions
- **Records:** All buy/sell/dividend transactions
- **Count:** ~10-100 per investment
- **Key Fields:** type, date, quantity, price, charges
- **Purpose:** Transaction history and audit trail

### 3. InvestmentCategories
- **Records:** Master data (26 types)
- **Count:** Fixed (~26 records)
- **Key Fields:** category_id, name, icon, config
- **Purpose:** Investment type definitions

### 4. InvestmentPerformance
- **Records:** Historical snapshots
- **Count:** Daily/weekly snapshots per investment
- **Key Fields:** date, value, returns, metrics
- **Purpose:** Performance tracking over time

### 5. InvestmentAlerts (Optional)
- **Records:** Price alerts and reminders
- **Count:** ~5-20 per user
- **Key Fields:** type, condition, target, status
- **Purpose:** User notifications

---

## Data Flow

```
┌──────────────┐
│  User Action │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌────────────────┐
│ Add/Buy      │────▶│  Investments   │
│ Investment   │     │  (Create/Update)│
└──────────────┘     └────────┬───────┘
                              │
                              ▼
                     ┌────────────────┐
                     │  Transactions  │
                     │  (Create Record)│
                     └────────┬───────┘
                              │
                              ▼
                     ┌────────────────┐
                     │  Performance   │
                     │  (Snapshot)    │
                     └────────────────┘
```

---

## Investment Types Supported

### Market Investments
1. Stocks / Shares
2. Mutual Funds
3. ETF
4. Bonds
5. REIT

### Fixed Income
6. Fixed Deposit (FD)
7. Corporate Deposit
8. Recurring Deposit (RD)

### Government Schemes
9. PPF
10. NPS
11. EPF

### Physical Assets
12. Gold
13. Silver

### Insurance
14. LIC
15. Term Insurance
16. Mediclaim
17. Motor Insurance

### Vehicles
18. Car
19. Two-Wheeler
20. Other Vehicles

### Others
21. ESOP
22. Private Equity
23. Arts & Artifacts
24. AIF
25. Cryptocurrency
26. Others

---

## Key Features

### ✅ Scalability
- Handles millions of records
- Optimized indexes for fast queries
- Denormalized data for performance

### ✅ Flexibility
- `type_specific_data` JSON field
- Supports new investment types easily
- Configurable categories

### ✅ Data Integrity
- Foreign key relationships
- Validation rules
- Soft delete flags

### ✅ Performance
- Composite indexes
- Caching strategy
- Batch operations support

### ✅ Security
- User-based access control
- Firestore security rules
- Audit trail

### ✅ Integration
- Reuses existing user auth
- Compatible with notification system
- No duplication of existing tables

---

## Critical Fields

### Must-Have Fields
```javascript
{
  investment_id: "Primary identifier",
  user_id: "Owner reference",
  investment_name: "Display name",
  investment_type: "Category",
  invested_amount: "Total invested",
  current_value: "Current worth",
  quantity: "Units held",
  gain_loss: "Profit/Loss",
  status: "active/closed/matured",
  buy_date: "Purchase date",
  is_active: "Soft delete flag"
}
```

### Calculated Fields
```javascript
{
  gain_loss: current_value - invested_amount,
  gain_loss_percentage: (gain_loss / invested_amount) * 100,
  average_buy_price: invested_amount / quantity,
  current_price: current_value / quantity
}
```

---

## Query Performance

### Indexed Queries (Fast ⚡)
```javascript
// Get user's active investments
user_id + is_active + status

// Get investments by type
user_id + investment_type

// Get transaction history
investment_id + transaction_date

// Get performance data
investment_id + snapshot_date
```

### Composite Indexes Required
```javascript
1. user_id + status + created_at
2. user_id + investment_type + is_active
3. investment_id + transaction_type + date
4. user_id + gain_loss_percentage (DESC)
```

---

## Storage Estimates

### Per User
- Active Investments: ~50 records × 2KB = **100 KB**
- Transactions: ~500 records × 1KB = **500 KB**
- Performance Snapshots: ~1000 records × 0.5KB = **500 KB**
- **Total per user:** ~1.1 MB

### For 10,000 Users
- Total Storage: **~11 GB**
- Queries/month: **~5 million**
- Writes/month: **~1 million**

---

## Backup Strategy

### Daily Backups
- Investments collection
- Investment transactions
- Performance data

### Retention
- 30 days rolling backup
- Monthly archives for 1 year

---

## Migration Path

### Phase 1: Schema Creation
- Create new collections
- Set up indexes
- Configure security rules

### Phase 2: Data Migration
- Migrate existing investment data
- Create initial transactions
- Generate performance snapshots

### Phase 3: Testing
- Verify data integrity
- Test query performance
- Validate calculations

### Phase 4: Deployment
- Enable new schema
- Monitor performance
- Gradual rollout

---

## Next Steps

1. **Implementation:**
   - Create Firestore collections
   - Set up composite indexes
   - Implement security rules

2. **Backend Updates:**
   - Update investments.py API
   - Add transaction endpoints
   - Implement performance tracking

3. **Frontend Integration:**
   - Connect to new schema
   - Update data models
   - Test CRUD operations

4. **Testing:**
   - Load testing with dummy data
   - Query performance testing
   - Security rule validation

---

## References

- Full Schema: `/app/memory/INVESTMENTS_DATABASE_SCHEMA.md`
- Backend Implementation: `/app/backend/investments.py`
- Frontend Models: `/app/frontend/app/investments/types.ts`

---

**Last Updated:** December 2024
**Version:** 1.0
**Status:** Ready for Implementation
