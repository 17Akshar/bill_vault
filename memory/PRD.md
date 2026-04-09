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

## Phase 2 — COMPLETED ✅

### Backend (28/28 Phase 2 tests + 11/11 Reminders tests passed)
- **Credit Cards CRUD**: POST/GET/PUT/DELETE; fields: name, card_number_last4, credit_limit, current_outstanding, billing_date, due_date, interest_rate, family_member_id
- **Loans CRUD**: POST/GET/PUT/DELETE; types: home/car/personal/education/gold/other; EMI tracking, tenure, interest rate
- **Lending CRUD**: POST/GET/PUT/DELETE; types: lent/borrowed; settlement tracking, filter by type/status
- **Investments CRUD**: POST/GET/PUT/DELETE; types: stocks/mutual_fund/fd/rd/ppf/nps/gold/real_estate/crypto/other; returns calculation
- **Net Worth API**: GET aggregates assets (accounts + investments + money lent) minus liabilities (credit cards + loans + money borrowed)
- **Reminders CRUD**: POST/GET/PUT/DELETE; types: investment/loan_emi/credit_card/lending/bill/custom; recurring support; summary endpoint with overdue/today/this_week counts; enriched with related item details

### Frontend (All Phase 2 screens tested)
- **Dashboard Financial Hub**: 6 navigable cards — Credit Cards, Loans & EMI, Investments, Lent/Borrowed, Net Worth, Reminders
- **Credit Cards Screen**: Summary (limit/outstanding/available), card list with usage progress bars, add modal, remind button
- **Loans Screen**: Summary (outstanding/monthly EMI), loan cards with type icons and repayment progress, add modal with type chips, remind button
- **Investments Screen**: Summary (invested/current/returns %), investment cards with return calculations, add modal with type selector, remind & delete buttons
- **Lending Screen**: Summary (lent/borrowed totals), All/Lent/Borrowed filter tabs, settle/remind/delete actions, add modal with type toggle
- **Net Worth Screen**: Gradient hero card with total net worth, assets (accounts/investments/money lent) and liabilities (credit cards/loans/money borrowed) breakdown
- **Reminders Screen**: Summary bar (overdue/today/this week/total), filter tabs (All/Today/Upcoming/Overdue/Completed), add modal with type selection, quick date picker, recurrence options, mark complete/delete actions
- All screens linked from dashboard, remind buttons on Credit Cards, Loans, Investments, Lending screens

## Phase 3 — COMPLETED ✅
- Investment Analytics (CAGR, portfolio allocation donut chart, top/bottom performers)
- Cash Flow reports (monthly income vs expense bar chart, savings rate tracking, 3/6/12 month views)
- Expense Breakdown (category-wise donut chart, income/expense toggle, month selector)
- Income Breakdown (source-wise analysis)
- CSV Export (transactions, investments, net worth)
- Custom SVG charts (DonutChart, BarChart) built with react-native-svg

## Phase 4 — COMPLETED ✅
- Budget Goals (CRUD + progress tracking with category-wise spending vs limit, status alerts, unbudgeted spending detection)
- App Store prep (app.json updated: name, permissions, bundle IDs, splash screen)

