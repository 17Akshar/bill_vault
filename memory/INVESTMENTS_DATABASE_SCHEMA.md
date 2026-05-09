# Investments Database Schema

## Overview
Scalable database schema for the Investments feature supporting multiple investment types, transaction tracking, performance monitoring, and portfolio analytics.

---

## Database Architecture

**Database Type:** Firestore (NoSQL) / Compatible with SQL databases
**Collections:** 4 main collections + 1 lookup collection
**Relationships:** User-based partitioning with foreign key references

---

## 1. Investments Collection

**Collection Name:** `investments`

### Purpose
Main collection storing individual investment records across all types (stocks, mutual funds, gold, etc.)

### Schema

```typescript
{
  investment_id: string,           // Primary Key: "inv_" + UUID
  user_id: string,                 // Foreign Key: references users collection
  
  // Investment Details
  investment_name: string,         // e.g., "Reliance Industries", "SBI Bluechip Fund"
  investment_type: string,         // enum: stocks, mutual_funds, etf, bonds, fd, gold, ppf, nps, etc.
  category_id: string,             // Foreign Key: references investment_categories
  
  // Financial Data
  invested_amount: number,         // Total amount invested (sum of all buy transactions)
  current_value: number,           // Current market value
  quantity: number,                // Units/shares/grams held
  average_buy_price: number,       // Weighted average purchase price
  current_price: number,           // Latest price per unit
  
  // Calculated Fields
  gain_loss: number,               // current_value - invested_amount
  gain_loss_percentage: number,    // (gain_loss / invested_amount) * 100
  realized_gain_loss: number,      // Profit/loss from sold positions
  unrealized_gain_loss: number,    // Profit/loss from active positions
  
  // Dates
  buy_date: timestamp,             // First purchase date
  last_updated: timestamp,         // Last price/value update
  maturity_date: timestamp,        // For FD, bonds, insurance (nullable)
  sell_date: timestamp,            // Full exit date (nullable)
  
  // Charges & Fees
  total_brokerage_charges: number, // Sum of all transaction charges
  annual_maintenance_fee: number,  // Yearly fees (nullable)
  
  // Status & Metadata
  status: string,                  // enum: active, closed, matured, partially_sold
  is_active: boolean,              // Soft delete flag
  
  // Additional Information
  notes: string,                   // User notes (nullable)
  linked_account_id: string,       // Bank/Demat account reference (nullable)
  family_member_id: string,        // Reference to family members collection (nullable)
  
  // Type-Specific Data
  type_specific_data: object,      // Flexible JSON for type-specific fields
  /*
    Example for Stocks:
    {
      company_name: string,
      exchange: string,
      symbol: string,
      isin: string,
      sector: string
    }
    
    Example for Mutual Funds:
    {
      fund_name: string,
      folio_number: string,
      amc: string,
      nav: number,
      plan_type: string
    }
    
    Example for FD:
    {
      bank_name: string,
      fd_number: string,
      interest_rate: number,
      tenure_months: number
    }
  */
  
  // Documents & Alerts
  documents: array,                // Array of document URLs/references
  reminders: array,                // Array of reminder objects
  
  // Audit Fields
  created_at: timestamp,
  updated_at: timestamp,
  created_by: string,              // user_id
  last_modified_by: string         // user_id
}
```

### Indexes

```javascript
// Firestore Composite Indexes
- user_id + status (for filtering active/closed investments)
- user_id + investment_type (for category views)
- user_id + created_at (for timeline sorting)
- user_id + gain_loss (for performance sorting)
- category_id + status

// Single Field Indexes
- investment_id (primary key)
- user_id
- investment_type
- status
- maturity_date
```

---

## 2. InvestmentTransactions Collection

**Collection Name:** `investment_transactions`

### Purpose
Tracks all buy, sell, dividend, and charge transactions for investments

### Schema

```typescript
{
  transaction_id: string,          // Primary Key: "txn_" + UUID
  investment_id: string,           // Foreign Key: references investments
  user_id: string,                 // Foreign Key: references users
  
  // Transaction Details
  transaction_type: string,        // enum: buy, sell, dividend, charges, bonus, split
  transaction_date: timestamp,     // Date of transaction
  
  // Financial Data
  quantity: number,                // Units/shares transacted
  price_per_unit: number,          // Price at transaction
  total_amount: number,            // Total transaction value
  
  // Charges
  brokerage_charges: number,       // Transaction charges
  stt_charges: number,             // Securities Transaction Tax (nullable)
  gst_charges: number,             // GST on charges (nullable)
  stamp_duty: number,              // Stamp duty (nullable)
  other_charges: number,           // Other fees (nullable)
  net_amount: number,              // Total amount including all charges
  
  // Additional Info
  notes: string,                   // Transaction notes (nullable)
  broker_name: string,             // Broker/platform used (nullable)
  order_id: string,                // External order reference (nullable)
  
  // Type-Specific Data
  transaction_details: object,     // Flexible JSON for type-specific data
  /*
    For Dividends:
    {
      dividend_per_share: number,
      dividend_type: string,        // interim, final
      tax_deducted: number
    }
    
    For Bonus/Split:
    {
      ratio: string,                // e.g., "1:1", "2:1"
      old_quantity: number,
      new_quantity: number
    }
  */
  
  // Audit Fields
  created_at: timestamp,
  created_by: string,              // user_id
  is_active: boolean               // Soft delete flag
}
```

### Indexes

```javascript
// Firestore Composite Indexes
- investment_id + transaction_date (for transaction history)
- user_id + transaction_type (for filtering by type)
- user_id + transaction_date (for user transaction timeline)
- investment_id + transaction_type (for type-specific queries)

// Single Field Indexes
- transaction_id (primary key)
- investment_id
- user_id
- transaction_type
- transaction_date
```

---

## 3. InvestmentCategories Collection

**Collection Name:** `investment_categories`

### Purpose
Master data for investment types and their configurations

### Schema

```typescript
{
  category_id: string,             // Primary Key: stocks, mutual_funds, etc.
  category_name: string,           // Display name: "Shares / Stocks"
  category_group: string,          // enum: market, fixed_income, physical, insurance, vehicle, other
  
  // Display Properties
  icon: string,                    // Icon identifier
  color: string,                   // Hex color code
  sort_order: number,              // Display order
  
  // Configuration
  is_active: boolean,              // Enable/disable category
  requires_quantity: boolean,      // Whether quantity field is mandatory
  supports_dividends: boolean,     // Whether dividends can be tracked
  supports_maturity: boolean,      // Whether maturity date applies
  
  // Field Definitions
  required_fields: array,          // Array of mandatory field names
  optional_fields: array,          // Array of optional field names
  field_configurations: object,    // Field validation rules
  
  // Metadata
  description: string,             // Category description
  examples: array,                 // Example investment names
  
  created_at: timestamp,
  updated_at: timestamp
}
```

### Sample Data

```javascript
[
  {
    category_id: "stocks",
    category_name: "Shares / Stocks",
    category_group: "market",
    icon: "trending-up",
    color: "#00E676",
    sort_order: 1,
    is_active: true,
    requires_quantity: true,
    supports_dividends: true,
    supports_maturity: false,
    required_fields: ["company_name", "quantity", "buy_price"],
    optional_fields: ["exchange", "symbol", "isin", "sector"]
  },
  {
    category_id: "mutual_funds",
    category_name: "Mutual Funds",
    category_group: "market",
    icon: "pie-chart",
    color: "#448AFF",
    sort_order: 2,
    is_active: true,
    requires_quantity: true,
    supports_dividends: true,
    supports_maturity: false,
    required_fields: ["fund_name", "units", "nav"],
    optional_fields: ["folio_number", "amc", "plan_type"]
  }
  // ... more categories
]
```

### Indexes

```javascript
- category_id (primary key)
- category_group
- is_active
- sort_order
```

---

## 4. InvestmentPerformance Collection

**Collection Name:** `investment_performance`

### Purpose
Stores historical performance data for tracking investment value over time

### Schema

```typescript
{
  performance_id: string,          // Primary Key: "perf_" + UUID
  investment_id: string,           // Foreign Key: references investments
  user_id: string,                 // Foreign Key: references users
  
  // Performance Snapshot
  snapshot_date: timestamp,        // Date of snapshot
  current_value: number,           // Investment value at snapshot
  current_price: number,           // Price per unit at snapshot
  quantity: number,                // Holdings at snapshot
  
  // Calculated Metrics
  day_change: number,              // Change from previous day
  day_change_percentage: number,   // % change from previous day
  total_gain_loss: number,         // Total P&L at snapshot
  total_gain_loss_percentage: number,
  
  // Period Returns
  one_day_return: number,
  one_week_return: number,
  one_month_return: number,
  three_month_return: number,
  six_month_return: number,
  one_year_return: number,
  all_time_return: number,
  
  // XIRR & Other Metrics
  xirr: number,                    // Extended Internal Rate of Return (nullable)
  absolute_return: number,         // Simple return calculation
  
  // Metadata
  snapshot_type: string,           // enum: daily, weekly, monthly, manual
  is_active: boolean,
  created_at: timestamp
}
```

### Indexes

```javascript
// Firestore Composite Indexes
- investment_id + snapshot_date (for time series queries)
- user_id + snapshot_date (for portfolio performance)
- investment_id + snapshot_type (for filtering snapshot types)

// Single Field Indexes
- performance_id (primary key)
- investment_id
- user_id
- snapshot_date
```

---

## 5. InvestmentAlerts Collection (Optional)

**Collection Name:** `investment_alerts`

### Purpose
Manages price alerts, maturity reminders, and investment notifications

### Schema

```typescript
{
  alert_id: string,                // Primary Key: "alert_" + UUID
  investment_id: string,           // Foreign Key: references investments
  user_id: string,                 // Foreign Key: references users
  
  // Alert Configuration
  alert_type: string,              // enum: price_target, maturity, dividend, rebalance
  alert_condition: string,         // enum: above, below, equals
  target_value: number,            // Alert trigger value
  
  // Alert Details
  title: string,                   // Alert title
  message: string,                 // Alert message
  priority: string,                // enum: low, medium, high
  
  // Status
  is_triggered: boolean,           // Whether alert has been triggered
  triggered_at: timestamp,         // When alert was triggered (nullable)
  is_active: boolean,              // Whether alert is active
  is_recurring: boolean,           // For recurring alerts
  
  // Dates
  created_at: timestamp,
  updated_at: timestamp,
  expires_at: timestamp            // Alert expiry (nullable)
}
```

### Indexes

```javascript
- alert_id (primary key)
- investment_id
- user_id + is_active
- user_id + alert_type
```

---

## Relationships & Constraints

### Entity Relationships

```
Users (existing)
  ↓ 1:N
Investments
  ↓ 1:N
InvestmentTransactions
  
Investments
  ↓ N:1
InvestmentCategories

Investments
  ↓ 1:N
InvestmentPerformance

Investments
  ↓ 1:N
InvestmentAlerts
```

### Foreign Key Constraints

```sql
-- If using SQL database
ALTER TABLE investments 
  ADD CONSTRAINT fk_user 
  FOREIGN KEY (user_id) REFERENCES users(user_id);

ALTER TABLE investment_transactions 
  ADD CONSTRAINT fk_investment 
  FOREIGN KEY (investment_id) REFERENCES investments(investment_id);

ALTER TABLE investment_performance 
  ADD CONSTRAINT fk_investment 
  FOREIGN KEY (investment_id) REFERENCES investments(investment_id);
```

---

## Data Validation Rules

### Investments Collection

```javascript
{
  invested_amount: { type: 'number', min: 0, required: true },
  current_value: { type: 'number', min: 0, required: true },
  quantity: { type: 'number', min: 0, required: true },
  status: { 
    type: 'string', 
    enum: ['active', 'closed', 'matured', 'partially_sold'],
    required: true 
  },
  investment_type: {
    type: 'string',
    enum: ['stocks', 'mutual_funds', 'etf', 'bonds', 'reit', 'fd', 'corporate_deposit', 'rd', 'ppf', 'nps', 'epf', 'gold', 'silver', 'insurance', 'vehicle', 'crypto', 'others'],
    required: true
  }
}
```

### InvestmentTransactions Collection

```javascript
{
  transaction_type: {
    type: 'string',
    enum: ['buy', 'sell', 'dividend', 'charges', 'bonus', 'split'],
    required: true
  },
  quantity: { type: 'number', min: 0, required: true },
  total_amount: { type: 'number', required: true },
  brokerage_charges: { type: 'number', min: 0, default: 0 }
}
```

---

## Queries & Access Patterns

### Common Query Patterns

```javascript
// 1. Get user's active investments
db.investments
  .where('user_id', '==', userId)
  .where('is_active', '==', true)
  .where('status', '==', 'active')
  .orderBy('created_at', 'desc')

// 2. Get investments by type
db.investments
  .where('user_id', '==', userId)
  .where('investment_type', '==', 'stocks')
  .where('is_active', '==', true)

// 3. Get transaction history for investment
db.investment_transactions
  .where('investment_id', '==', investmentId)
  .orderBy('transaction_date', 'desc')

// 4. Get portfolio performance over time
db.investment_performance
  .where('user_id', '==', userId)
  .where('snapshot_date', '>=', startDate)
  .where('snapshot_date', '<=', endDate)
  .orderBy('snapshot_date', 'asc')

// 5. Get top performing investments
db.investments
  .where('user_id', '==', userId)
  .where('is_active', '==', true)
  .orderBy('gain_loss_percentage', 'desc')
  .limit(10)

// 6. Get maturing investments
db.investments
  .where('user_id', '==', userId)
  .where('maturity_date', '>=', today)
  .where('maturity_date', '<=', thirtyDaysFromToday)
  .where('status', '==', 'active')
```

---

## Data Migration Strategy

### From Existing Structure

```javascript
// If migrating from simple structure
async function migrateInvestments() {
  const oldInvestments = await db.old_investments.get();
  
  for (const old of oldInvestments) {
    const newInvestment = {
      investment_id: old.id,
      user_id: old.user_id,
      investment_name: old.name,
      investment_type: old.type,
      invested_amount: old.amount,
      current_value: old.value,
      quantity: old.units || 1,
      average_buy_price: old.amount / (old.units || 1),
      current_price: old.value / (old.units || 1),
      gain_loss: old.value - old.amount,
      gain_loss_percentage: ((old.value - old.amount) / old.amount) * 100,
      buy_date: old.purchase_date,
      status: 'active',
      is_active: true,
      notes: old.notes || '',
      type_specific_data: {},
      created_at: old.created_at,
      updated_at: new Date()
    };
    
    await db.investments.add(newInvestment);
  }
}
```

---

## Performance Optimization

### 1. Denormalization Strategy

```javascript
// Store frequently accessed data in parent document
investments: {
  last_transaction_date: timestamp,    // Denormalized from transactions
  transaction_count: number,           // Denormalized count
  dividend_count: number,              // Denormalized count
  total_dividends_received: number     // Denormalized sum
}
```

### 2. Caching Strategy

```javascript
// Cache portfolio summary in memory
const portfolioCache = {
  userId: string,
  totalInvested: number,
  totalCurrentValue: number,
  totalGainLoss: number,
  lastUpdated: timestamp,
  ttl: 300 // 5 minutes
};
```

### 3. Batch Operations

```javascript
// Batch update for multiple investments
const batch = db.batch();
investmentIds.forEach(id => {
  const ref = db.investments.doc(id);
  batch.update(ref, { last_updated: new Date() });
});
await batch.commit();
```

---

## Security Rules (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Investments Collection
    match /investments/{investmentId} {
      allow read: if request.auth != null && 
                     resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.user_id == request.auth.uid;
      allow update: if request.auth != null && 
                       resource.data.user_id == request.auth.uid;
      allow delete: if request.auth != null && 
                       resource.data.user_id == request.auth.uid;
    }
    
    // Investment Transactions
    match /investment_transactions/{transactionId} {
      allow read: if request.auth != null && 
                     resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null && 
                       request.resource.data.user_id == request.auth.uid;
      allow update: if request.auth != null && 
                       resource.data.user_id == request.auth.uid;
    }
    
    // Investment Categories (Read-only for users)
    match /investment_categories/{categoryId} {
      allow read: if request.auth != null;
      allow write: if false; // Admin only
    }
    
    // Investment Performance
    match /investment_performance/{performanceId} {
      allow read: if request.auth != null && 
                     resource.data.user_id == request.auth.uid;
      allow create: if request.auth != null; // System-generated
    }
  }
}
```

---

## Backup & Recovery

### Backup Strategy

```javascript
// Daily backup configuration
{
  schedule: "0 2 * * *",        // 2 AM daily
  collections: [
    "investments",
    "investment_transactions",
    "investment_performance"
  ],
  retention: 30 // days
}
```

---

## Monitoring & Analytics

### Key Metrics to Track

```javascript
{
  total_investments: count,
  active_investments: count,
  total_portfolio_value: sum,
  total_transactions: count,
  avg_gain_loss_percentage: avg,
  top_performing_category: string,
  users_with_investments: count
}
```

---

## Notes

1. **Scalability:** Schema supports millions of investments per user
2. **Flexibility:** `type_specific_data` allows for easy addition of new investment types
3. **Performance:** Composite indexes ensure fast queries
4. **Audit Trail:** All records include created_at, updated_at fields
5. **Soft Deletes:** Use `is_active` flag instead of hard deletes
6. **Reusability:** Integrates with existing user authentication system
7. **No Duplication:** Uses existing users collection, notification system
