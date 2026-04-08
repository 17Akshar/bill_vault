# Product Requirements Document - Personal & Family Financial Management System

## Phase 1 — COMPLETED ✅

### Backend (47/47 tests passed)
- **Authentication**: Email/password registration, login, single-user mode, JWT tokens
- **Family Members CRUD**: POST/GET/PUT/DELETE with roles (self, spouse, child, parent, sibling)
- **Accounts CRUD**: Bank, Cash, UPI, Credit Card types; soft-delete; filter by type/family member
- **Income CRUD**: Auto-updates account balance; filters by date/month/category/account/family member
- **Expenses CRUD**: Auto-updates account balance; filters by date/month/category/account/family member/payment type
- **Dashboard**: Total balance, monthly income/expenses/savings, account summaries, upcoming/overdue bills, recent transactions, category breakdowns — all with Indian Rupee (₹) formatting
- **Bills CRUD**: Recurring support, categories, payment status
- **Analytics**: Category breakdown, budget status
- **Export**: All user data (accounts, income, expenses, bills, family members)

### Frontend (10/10 screens tested)
- **Dashboard**: Gradient balance card, monthly summary, quick actions, accounts scroll, recent transactions, overdue alerts
- **Transactions**: Month selector, All/Income/Expense filters, category icons, long-press delete
- **Accounts**: Total balance, type filter chips, account cards, FAB to add
- **Add Account**: Type selector cards (Bank/Cash/UPI/Credit Card), name, balance, account number
- **Add Transaction**: Income/Expense toggle, ₹ amount input, category chips, account picker modal, date picker, payment type, notes
- **Family Members**: Add/delete with role selection, color-coded roles
- **5-Tab Navigation**: Home, Transactions, Accounts, Bills, More
- **Dark Theme**: CRED-style premium dark UI (background #0D0D12, accent #6C5CE7)
- **Indian Rupee**: ₹ formatting throughout (₹1,00,000 Indian numbering system)

### Tech Stack
- Frontend: Expo React Native (expo-router, expo-linear-gradient, react-native-gifted-charts)
- Backend: FastAPI + Motor (async MongoDB)
- Database: MongoDB
- Auth: JWT + bcrypt + Google OAuth

---

## Phase 2 — UPCOMING
- Credit Card management
- Loan management (EMI tracking)
- Money lent/borrowed module
- Basic investment tracker
- Net worth calculator
- Excel export

## Phase 3 — FUTURE
- Advanced Investment Analytics (XIRR, CAGR)
- Portfolio analysis
- Advanced cash flow charts

## Phase 4 — BACKLOG
- Offline-first architecture (local device storage + OneDrive sync)
- App Store submission prep
- Reminders & alerts
