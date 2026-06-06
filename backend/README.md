# Fincare Backend API

Complete REST API backend for the Fincare Personal Finance application.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via `pg` Pool, raw SQL queries only)
- **Auth**: JWT + Refresh Tokens
- **Validation**: Joi
- **File Uploads**: Multer
- **Password Hashing**: bcryptjs

---

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy `.env` and fill in your credentials:

```bash
cp .env .env.local
```

Update `DATABASE_URL` with your Nhost PostgreSQL connection string:

```
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/<database>
```

### 3. Run migrations

```bash
npm run migrate
```

### 4. Seed default data

```bash
npm run seed
```

### 5. Start server

```bash
# Development
npm run dev

# Production
npm start
```

Server runs on `http://localhost:8000`

---

## API Documentation

### Base URL
```
http://localhost:8000/api
```

### Authentication
All protected routes require:
```
Authorization: Bearer <token>
```

---

## Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login |
| POST | `/auth/refresh` | Refresh JWT token |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get current user |
| PUT | `/auth/me` | Update profile |
| PUT | `/auth/change-password` | Change password |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Full dashboard data |
| GET | `/dashboard/net-worth-history` | Net worth over time |

### Accounts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/accounts` | List all accounts |
| POST | `/accounts` | Create account |
| GET | `/accounts/:id` | Get account |
| PUT | `/accounts/:id` | Update account |
| DELETE | `/accounts/:id` | Soft-delete account |
| GET | `/accounts/:id/transactions` | Account transactions |
| GET | `/accounts/:id/stats` | Account statistics |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/transactions` | List with filters |
| POST | `/transactions` | Create transaction |
| GET | `/transactions/summary` | Monthly/annual summary |
| GET | `/transactions/category-breakdown` | Breakdown by category |
| GET | `/transactions/monthly-trend` | Monthly trend data |
| GET | `/transactions/:id` | Get transaction |
| PUT | `/transactions/:id` | Update transaction |
| DELETE | `/transactions/:id` | Delete transaction |

**Query params for GET /transactions:**
- `type`: income|expense|transfer|all
- `month`: 1-12
- `year`: 2024
- `account_id`: UUID
- `category_id`: UUID
- `search`: text
- `min_amount`, `max_amount`: number
- `sort`: date_asc|date_desc|amount_asc|amount_desc
- `page`, `limit`: pagination

### Investments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/investments` | List investments |
| POST | `/investments` | Add investment |
| GET | `/investments/portfolio` | Portfolio summary |
| GET | `/investments/:id` | Get investment |
| PUT | `/investments/:id` | Update investment |
| DELETE | `/investments/:id` | Mark sold |
| PATCH | `/investments/:id/price` | Update current price |
| GET | `/investments/:id/transactions` | Transaction history |
| POST | `/investments/:id/transactions` | Add buy/sell transaction |
| GET | `/investments/:id/notes` | Investment notes |
| POST | `/investments/:id/notes` | Add note |

**Investment categories:** `mutual_fund`, `etf`, `stock`, `fd`, `cd`, `rd`, `bond`, `gold`, `nps`, `ppf`, `epf`, `crypto`, `esop`, `private_equity`, `aif`, `artwork`, `real_estate`, `other`

### Insurance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/insurance` | List policies |
| POST | `/insurance` | Add policy |
| GET | `/insurance/:id` | Get policy (with claims & payments) |
| PUT | `/insurance/:id` | Update policy |
| DELETE | `/insurance/:id` | Surrender policy |
| POST | `/insurance/:id/pay-premium` | Record premium payment |
| POST | `/insurance/:id/claims` | File claim |
| PUT | `/insurance/:id/claims/:claimId` | Update claim status |

### Loans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/loans` | List loans |
| POST | `/loans` | Add loan |
| GET | `/loans/insights` | Loan insights with EMI calc |
| GET | `/loans/:id` | Get loan details |
| PUT | `/loans/:id` | Update loan |
| DELETE | `/loans/:id` | Close loan |
| POST | `/loans/:id/transactions` | Record EMI/prepayment |

### Credit Cards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/credit-cards` | List cards |
| POST | `/credit-cards` | Add card |
| GET | `/credit-cards/:id` | Get card details |
| PUT | `/credit-cards/:id` | Update card |
| DELETE | `/credit-cards/:id` | Cancel card |
| GET | `/credit-cards/:id/transactions` | Card transactions |
| POST | `/credit-cards/:id/transactions` | Add transaction |
| POST | `/credit-cards/:id/payment` | Make payment |

### Rentals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/rentals` | List properties |
| POST | `/rentals` | Add property |
| GET | `/rentals/:id` | Get property |
| PUT | `/rentals/:id` | Update property |
| DELETE | `/rentals/:id` | Delete property |
| POST | `/rentals/:id/transactions` | Record rent/expense |
| GET | `/rentals/:id/transactions` | Transaction history |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reminders` | List reminders |
| POST | `/reminders` | Create reminder |
| GET | `/reminders/summary` | Summary counts |
| GET | `/reminders/calendar` | Calendar view |
| GET | `/reminders/:id` | Get reminder |
| PUT | `/reminders/:id` | Update reminder |
| DELETE | `/reminders/:id` | Delete reminder |
| POST | `/reminders/:id/pay` | Mark as paid |

### Budgets
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/budgets` | List budgets (with spent calc) |
| POST | `/budgets` | Create budget |
| GET | `/budgets/analytics` | Budget vs actual analytics |
| GET | `/budgets/:id` | Get budget |
| PUT | `/budgets/:id` | Update budget |
| DELETE | `/budgets/:id` | Delete budget |

### Goals
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/goals` | List goals |
| POST | `/goals` | Create goal |
| GET | `/goals/:id` | Get goal |
| PUT | `/goals/:id` | Update goal |
| DELETE | `/goals/:id` | Delete goal |
| POST | `/goals/:id/contribute` | Add contribution |

### Lending (Money Lent/Borrowed)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/lending` | List entries |
| POST | `/lending` | Add entry |
| GET | `/lending/:id` | Get entry |
| PUT | `/lending/:id` | Update entry |
| DELETE | `/lending/:id` | Delete entry |
| POST | `/lending/:id/payment` | Record payment/receipt |

### Categories
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List all (default + user's) |
| POST | `/categories` | Create custom category |
| PUT | `/categories/:id` | Update category |
| DELETE | `/categories/:id` | Delete custom category |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analytics/overview` | Net worth overview |
| GET | `/analytics/income-expense` | Annual income/expense report |
| GET | `/analytics/categories` | Category spending breakdown |
| GET | `/analytics/portfolio-allocation` | Investment allocation |
| GET | `/analytics/savings-rate` | Monthly savings rate trend |
| GET | `/analytics/top-spending` | Top spending entries |
| GET | `/analytics/tax-summary` | Tax summary for year |

### Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/profiles` | List family profiles |
| POST | `/profiles` | Create profile |
| PUT | `/profiles/:id` | Update profile |
| DELETE | `/profiles/:id` | Delete profile |

### File Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload file (multipart/form-data) |
| GET | `/upload` | List user's files |
| DELETE | `/upload/:id` | Delete file |

---

## Response Format

### Success
```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": {}
}
```

### Paginated
```json
{
  "success": true,
  "message": "Data fetched successfully",
  "data": [],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": ["field is required"]
}
```

---

## Business Logic

### Net Worth Calculation
```
Net Worth = (Bank Balances + Investment Current Value + Rental Market Value)
          - (Loan Outstanding + Credit Card Outstanding)
```

### EMI Calculation
```
EMI = P × r × (1+r)^n / ((1+r)^n - 1)
where r = annual_rate / 12 / 100, n = tenure_months
```

### Investment Returns
```
Absolute Return = Current Value - Invested Amount
Percentage Return = (Absolute / Invested) × 100
CAGR = (Current/Initial)^(1/years) - 1
```

### Budget Tracking
- Spent is calculated from matching transactions in the budget period
- Alert threshold configurable per budget (default 80%)
- Rollover support for unused budget amounts

### FD Maturity Amount
```
Maturity = Principal × (1 + rate/n)^(n×t)
where n = compounding frequency (default: quarterly), t = tenure in years
```

---

## Database

Schema in `src/database/migrations/schema.sql`

Key tables:
- `users` — Authentication
- `accounts` — Bank/cash/wallet accounts
- `transactions` — Income/expense/transfer
- `categories` — Default + custom categories
- `investments` — All investment types
- `mutual_funds`, `fixed_deposits`, `recurring_deposits`, `gold_investments`, `crypto_investments`, `provident_funds` — Investment sub-tables
- `investment_transactions` — Buy/sell history
- `insurance_policies`, `insurance_premium_payments`, `insurance_claims` — Insurance
- `mediclaim_members` — Health insurance members
- `loans`, `loan_transactions` — Loans
- `credit_cards`, `credit_card_transactions`, `credit_card_payments` — Credit cards
- `rentals`, `rental_transactions` — Rental properties
- `reminders`, `reminder_payments` — Bill reminders
- `budgets` — Budget tracking
- `goals` — Financial goals
- `lending`, `lending_transactions` — Money lent/borrowed
- `notes` — Financial notes
- `other_assets` — Miscellaneous assets
- `user_profiles` — Family member profiles
- `file_uploads` — Document storage
- `notifications` — User notifications
- `refresh_tokens` — JWT refresh token management
