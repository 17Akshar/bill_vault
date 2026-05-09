# Investments Feature - Navigation & Screens

## Access Point
**More → Investments** (Added to profile screen)

---

## Screen Mapping

### 1. InvestmentsDashboardScreen
**File:** `/app/frontend/app/investments/index.tsx`
**Route:** `/investments`
**Features:**
- Portfolio summary (Total Value, Invested, Gain/Loss)
- Investment categories breakdown
- Filter by category (Market, Fixed Income, Physical, Insurance, Vehicles, Others)
- List of all investments with cards
- Quick actions (View, Delete)
- Add Investment button → Opens InvestmentTypeSelectionScreen

---

### 2. InvestmentTypeSelectionScreen
**File:** `/app/frontend/app/investments/select-type.tsx`
**Route:** `/investments/select-type`
**Features:**
- 26 investment types organized in 6 categories
- Grid layout with icons
- Categories:
  - **Market Investments:** Shares/Stocks, Mutual Funds, ETF, Bonds, REIT
  - **Fixed Income:** FD, Corporate Deposit, RD, PPF, NPS, EPF
  - **Physical Assets:** Gold, Silver
  - **Insurance:** LIC, Term Insurance, Mediclaim, Motor Insurance
  - **Vehicles:** Car, Two-Wheeler, Other
  - **Others:** ESOP, Private Equity, Arts & Artifacts, AIF, Cryptocurrency, Others
- Selecting a type → Opens AddInvestmentScreen with that type

---

### 3. AddInvestmentScreen
**File:** `/app/frontend/app/investments/add.tsx`
**Route:** `/investments/add?type={type_key}` or `/investments/add?id={investment_id}`
**Features:**
- Dynamic form based on investment type
- Common fields:
  - Investment name
  - Invested amount
  - Current value (auto-calculates gain/loss)
  - Purchase date
  - Maturity date (optional)
  - Status (active/closed/matured)
  - Notes
- Type-specific fields (renders dynamically based on selected type)
- Validation
- Works for both adding new and editing existing investments

---

### 4. InvestmentDetailsScreen
**File:** `/app/frontend/app/investments/[id].tsx`
**Route:** `/investments/{investment_id}`
**Features:**
- Investment header (name, type, status, metrics)
- Three tabs:
  - **Overview:** Basic info + type-specific details
  - **Transactions:** Transaction history + Add transaction
  - **Notes:** Investment notes
- Actions: Edit, Delete
- Add Transaction modal (buy/sell/mature/redeem)
- Pull-to-refresh

---

### 5. SharesStocksScreen / MutualFundsScreen (Category Views)
**Implementation:** 
These are handled by the **InvestmentDetailsScreen** which dynamically shows:
- Shares/Stocks specific fields: Company name, Exchange, Quantity, Buy price, Current price
- Mutual Funds specific fields: Fund name, Folio number, Units, NAV, AMC, Plan type
- Each investment type has its own field configuration in `types.ts`

The details screen adapts to show the correct fields based on the investment type.

---

### 6. InvestmentTransactionScreen
**Implementation:**
Built into **InvestmentDetailsScreen** as:
- **Transactions Tab:** Shows all transaction history
- **Add Transaction Modal:** Form to add buy/sell/mature/redeem transactions
- Transaction cards with type, amount, quantity, date, notes

---

## Navigation Flow

```
More (Profile)
  → Investments
     → InvestmentsDashboardScreen (index.tsx)
        ├── Tap "+" → InvestmentTypeSelectionScreen (select-type.tsx)
        │              ├── Select Type → AddInvestmentScreen (add.tsx)
        │              │                   └── Save → Back to Dashboard
        │              
        └── Tap Investment Card → InvestmentDetailsScreen ([id].tsx)
                                    ├── Overview Tab
                                    ├── Transactions Tab
                                    │   └── Add Transaction → Modal Form
                                    ├── Notes Tab
                                    └── Edit Button → AddInvestmentScreen (edit mode)
```

---

## Features Summary

✅ **26 Investment Types** with specific fields
✅ **Manual tracking** (no live market data)
✅ **Portfolio dashboard** with summary
✅ **Category filtering**
✅ **Transaction tracking** (buy/sell/mature/redeem)
✅ **Status management** (active/closed/matured)
✅ **Gain/Loss calculations**
✅ **Type-specific forms** with validation
✅ **Comprehensive detail views**
✅ **Reuses existing** theme, typography, navigation

---

## Backend API Endpoints

All endpoints available at `/api/investments`:

- `GET /api/investments/dashboard` - Portfolio summary
- `GET /api/investments` - List investments (with filters)
- `POST /api/investments` - Create investment
- `GET /api/investments/:id` - Get details
- `PUT /api/investments/:id` - Update investment
- `DELETE /api/investments/:id` - Delete investment
- `POST /api/investments/:id/transactions` - Add transaction
- `GET /api/investments/:id/transactions` - Get transactions

---

## Type Configuration

**File:** `/app/frontend/app/investments/types.ts`

Contains:
- All 26 investment type definitions
- Field configurations for each type
- Icons and colors
- Validation rules
- Helper functions

This allows easy addition of new investment types or modification of existing ones.

---

## Notes

- All screens follow React Native best practices
- Proper hook dependencies (no stale closures)
- Comprehensive error handling
- User-friendly alerts
- Pull-to-refresh on all list screens
- Responsive design
- Dark/Light theme support (from existing ThemeContext)
