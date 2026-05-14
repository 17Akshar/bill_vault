# BillVault / Fincare — PRD

## Application
Personal finance management mobile app (React Native / Expo) with FastAPI + Firebase Firestore backend.

## Core Architecture
- **Frontend**: React Native (Expo) — `/app/frontend/app/`
- **Backend**: FastAPI — `/app/backend/`
- **Database**: Firebase Firestore (via `firebase_config.py` wrapper)
- **Auth**: Firebase Auth + JWT fallback (`single-user` mode for local dev)

---

## What's Been Implemented

### Sessions 1–13 (pre-existing)
Auth, Dashboard, Income/Expense, Bills, Investments, Budget, Credit Cards, Rentals, Lending, Reports, Family, Push Notifications.

### Session 14 — Loans & EMIs Schema
Scalable 4-collection schema: `loans`, `loan_transactions`, `emi_reminders`, `loan_prepayments`.

### Session 15 — Loans Calculations + UI Redesign
`GET /api/loans/{id}/analytics` (7 live metrics). `loans/index.tsx` redesigned with portfolio card, animated progress bars, stat pills.

### Session 16 — Loan Detail Full-Page Screen
`loans/[id].tsx`: hero card, 3 tabs (Overview / EMI Schedule / Prepayments), amortization modal (paginated), Record EMI Payment modal, Add Prepayment modal.

### Session 18 — Insights UI Redesign (2026-05-14)
**All Insights tabs (Overview, Cash Flow, Spending, Budget, Trends) redesigned with dummy data per reference design**
- `OverviewTab` now renders: month navigator → This Month Overview card (3-column Income/Expenses/Savings + savings rate pill) → Net Cash Flow card (big value + delta + sparkline) → Quick Insights list (3 rows, icon-tinted) → Accounts Summary (Bank / Cash & Wallets / UPI / Overdraft)
- `CashFlowTab` rebuilt: segmented Period Tabs (This Month / This Quarter / This Year) → Net Cash Flow gradient hero (value + growth % + white sparkline) → Total Inflow/Outflow row → Cash In vs Cash Out stacked bar → Monthly Cash Flow Trend paired bar chart → Account-wise Cash Flow list (HDFC, ICICI, Wallets, UPI). "View Details" CTAs on every section.
- `SpendingTab` rebuilt: segmented Period Tabs → Spending Summary card (purple→pink gradient hero + Avg/Day, Txns, vs-Last stat strip) → 6-slice donut with center "Spent" label and 2-col legend → Spending by Category list (Food / Transport / Shopping / Entertainment / Bills / Others) with progress bars → Top Expenses list (Amazon, Swiggy, Uber, Netflix, Electricity) with rank badges. "View All" toggles expand/collapse.
- `BudgetTab` rebuilt: segmented Period Tabs → Budget Summary hero (status-aware purple/red gradient, total budget, On Track/Over Budget badge, days-left, white progress bar with % used + remaining/over) → Total Spent / Remaining stat strip → Over Budget callout card (red-bordered, badge count, per-cat over-by ₹ & %) → Budget by Category list (6 cats with budget/spent, color-coded progress bar (green/orange/red), and "₹X left" or "Over by ₹X" sub-line). "View All" toggle expand/collapse.
- `TrendsTab` rebuilt: segmented Period Tabs (This Month / Last 6 Months / This Year) → 3 trend cards (Income / Expense / Investment), each card has tinted accent icon + title + "View All" CTA, big colored total, delta pill (with inverse semantics for expense), and an animated area-line chart. Period switch rewires all 3 cards.
- Tab pill bar uses `LinearGradient` (PURPLE_DARK→PURPLE_LIGHT) for the active state.
- Constraint honoured throughout: UI-only, dummy data, no new backend logic.

### Session 17 — Insights Module (2026-05-14)
**6-tab Insights screen replacing placeholder analytics tab**

#### Backend: `insights.py`
| Endpoint | Purpose |
|---|---|
| `GET /api/insights/overview` | Monthly income/expense/savings, accounts summary, quick insights (5 auto-generated), over-budget categories |
| `GET /api/insights/calendar` | Daily income/expense map + recent transactions for calendar heatmap |
| `GET /api/insights/budget-status` | Budget limits vs actual expense transactions (fixes pre-existing bug in `/api/analytics/spending` which used bills not expenses) |
| `GET /api/insights/spending-trend` | Top-N category spending over M months |

#### Frontend: `(tabs)/analytics.tsx` — Complete rewrite
6 sub-tabs accessible via horizontal scrollable pill bar:

| Tab | Key Features |
|---|---|
| **Overview** | Month navigator, This Month card (income/expense/savings + delta%), savings rate pill, quick insights rows (icon + color + text), accounts summary |
| **Cash Flow** | Period chips (Month/Quarter/Year), net cash flow hero with sparkline, inflow/outflow cards, 6-month bar chart, month-by-month table |
| **Spending** | Month navigator, total spending, donut chart (top 7 categories), category list with progress bars and % |
| **Budget** | Month navigator, total budget summary card (On Track/Over Budget badge), per-category progress bars (color-coded: ok/warning/over), over-budget section |
| **Trends** | Period chips, 4 metric cards (Total Income/Expense/Net Savings/Avg Rate), Income/Expense/Savings Rate line chart area charts |
| **Calendar** | Month navigator, 7-col calendar grid with expense heat dots (intensity = spend amount), income dots, today highlight, day tap → filtered transaction list |

#### Navigation
- `_layout.tsx`: Insights tab now points to `analytics` (was pointing to `bills`)
- `bills` tab hidden from nav (`href: null`) — route still accessible

---

## API Surface — Insights Module
```
GET /api/insights/overview?month=&year=        Monthly financial overview
GET /api/insights/calendar?month=&year=        Daily data for calendar heatmap
GET /api/insights/budget-status?month=&year=   Budget vs actual expenses
GET /api/insights/spending-trend?months=       Category trend over N months

# Pre-existing analytics (reused by Insights)
GET /api/analytics/cashflow?months=            Monthly income/expense trend
GET /api/analytics/expense-breakdown           Category breakdown for spending tab
```

---

## Prioritized Backlog

### P0 — Loans
- [ ] "Generate EMI Schedule" button in EMI Schedule tab empty state
- [ ] Overdue EMI auto-detection (mark pending past due_date as overdue)

### P1 — Insights
- [x] Insights: Connect real investment data to Trends tab (investment returns over time) — *dummy UI shipped 2026-05-14; backend wiring pending*
- [ ] Insights: Wire dummy Overview UI + Investment Returns to real backend data
- [ ] Insights: Refactor `analytics.tsx` (~1400 lines) → split tabs into `components/analytics/*.tsx`
- [ ] Insights: "What if" savings rate simulator (increase income by X% → savings?)
- [ ] Insights: Export month summary as PDF/image

### P2 — Future
- [ ] Loans: Foreclosure date estimator
- [ ] Loans: Refinancing calculator
- [ ] Bills: Re-expose in navigation (currently hidden — only accessible via direct route)
