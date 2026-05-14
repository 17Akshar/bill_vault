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
**Every Insights tab (Overview, Cash Flow, Spending, Budget, Trends, Calendar) redesigned with dummy data per reference design**
- `OverviewTab` now renders: month navigator → This Month Overview card (3-column Income/Expenses/Savings + savings rate pill) → Net Cash Flow card (big value + delta + sparkline) → Quick Insights list (3 rows, icon-tinted) → Accounts Summary (Bank / Cash & Wallets / UPI / Overdraft)
- `CashFlowTab` rebuilt: segmented Period Tabs (This Month / This Quarter / This Year) → Net Cash Flow gradient hero (value + growth % + white sparkline) → Total Inflow/Outflow row → Cash In vs Cash Out stacked bar → Monthly Cash Flow Trend paired bar chart → Account-wise Cash Flow list (HDFC, ICICI, Wallets, UPI). "View Details" CTAs on every section.
- `SpendingTab` rebuilt: segmented Period Tabs → Spending Summary card (purple→pink gradient hero + Avg/Day, Txns, vs-Last stat strip) → 6-slice donut with center "Spent" label and 2-col legend → Spending by Category list (Food / Transport / Shopping / Entertainment / Bills / Others) with progress bars → Top Expenses list (Amazon, Swiggy, Uber, Netflix, Electricity) with rank badges. "View All" toggles expand/collapse.
- `BudgetTab` rebuilt: segmented Period Tabs → Budget Summary hero (status-aware purple/red gradient, total budget, On Track/Over Budget badge, days-left, white progress bar with % used + remaining/over) → Total Spent / Remaining stat strip → Over Budget callout card (red-bordered, badge count, per-cat over-by ₹ & %) → Budget by Category list (6 cats with budget/spent, color-coded progress bar (green/orange/red), and "₹X left" or "Over by ₹X" sub-line). "View All" toggle expand/collapse.
- `TrendsTab` rebuilt: segmented Period Tabs (This Month / Last 6 Months / This Year) → 3 trend cards (Income / Expense / Investment), each card has tinted accent icon + title + "View All" CTA, big colored total, delta pill (with inverse semantics for expense), and an animated area-line chart. Period switch rewires all 3 cards.
- `CalendarTab` rebuilt: month-navigator card (with prev/next + total-txns subtitle) → 7×N calendar grid with green/red dots per day (credit/debit), selected-day purple pill + today purple-border, legend → Daily summary header (title + txn count + day's credit/debit totals) → Transactions list per selected day (icon-tinted, name, category · time, amount, CREDIT/DEBIT badge) → empty state when no txns → **floating gradient FAB "+"** for quick-add (UI only).
- Tab pill bar uses `LinearGradient` (PURPLE_DARK→PURPLE_LIGHT) for the active state.
- Constraint honoured throughout: UI-only, dummy data, no new backend logic. `analytics.tsx` is now ~100% dummy-data-driven UI.

### Session 24 — Income Module Rebuild to Match Reference Design (2026-02)
**User uploaded actual reference design** (Cash Flow dashboard + Add Income form, both dark-theme with purple/green accents). Rebuilt Dashboard + Add screens to match pixel-by-pixel; other 3 screens kept.

#### `/app/frontend/app/income/index.tsx` — fully rebuilt
- Title: **"Cash Flow"** (matching reference)
- Period tabs at top: This Month / This Quarter / This Year (purple-filled active)
- **Total Income card**: white-on-dark card with green ₹value + delta-pill ("↑20% vs last month") + mini line sparkline on right
- **Total Inflow / Total Outflow row**: 2 cards side-by-side; green circle ↓ icon (inflow), red circle ↑ icon (outflow). Outflow comes from `/api/expenses` for the same period.
- **Income Trend bar chart**: 6-month BarChart with current-month bars (solid green) + planned dashed-overlay for "vs Last Month" comparison; legend with both swatches
- **Income Sources** list: top 4 categories with category icon + label + frequency ("Monthly") + amount + entry count + chevron
- **CTA row**: purple "+ Add Income" (primary) + outlined "View All Income"
- **Recent Income** list: account name + "•••• 1234" account-number masking + date + green amount; tap row → edit
- Empty state when no income.

#### `/app/frontend/app/income/add.tsx` — fully rebuilt to list-row pattern
- Header: ← / "Add Income" / **"Save"** link top-right (purple)
- **Amount card**: "Amount" label + green ₹ + 0 input + green camera button on right (receipt attach hook)
- **BASIC DETAILS** group card (rounded green-tint row icons):
  - Member · Who received this income? · "Select Member" → bottom-sheet picker
  - Account · Where this income is received? · "Select Account" → picker (reuses `/api/accounts`, shows balance)
  - Category · What is the source of income? · "Select Category" → picker (reuses `INCOME_CATEGORIES`)
  - Date · When did you receive this? · "14 May 2026" → date input modal
- **MORE DETAILS (OPTIONAL)** group:
  - Notes · "Add a note (optional)" → multiline modal
  - Location · "Add location (optional)" → text modal
  - Attach File · "Upload receipt or document" → stub (UI ready, file pipeline future)
- **ADDITIONAL DETAILS (OPTIONAL)** group:
  - Income Type · picker
  - Payment Mode · picker (Bank Transfer / Cash / UPI / Cheque / Card)
  - Taxable Income · inline Switch
  - Recurring Income · inline Switch
  - Frequency · picker (enabled only when Recurring is ON)
  - Next Expected Date · auto-suggested from `date + frequency`, editable
- **Trust banner**: purple-tinted card with shield-checkmark "Keep your data secure / Your income details are encrypted and 100% secure."
- **Sticky bottom**: Save Income purple gradient button + Delete icon button (edit mode only)
- Data persistence: maps all optional fields into `labels[]` array (`taxable`, `recurring`, `freq:<x>`, `mode:<x>`, `loc:<x>`, `next:<iso>`) so **zero backend schema changes** required. Re-loaded correctly on edit.

#### Pickers
- Custom bottom-sheet modal component handles Member / Account / Category / Type / Mode / Frequency. Notes / Location / Date use lightweight inline text modals.

#### Validation
- Webpack rebundled cleanly. Live screenshots confirm both screens match the reference: empty-state Cash Flow dashboard and full Add Income form rendered correctly with all rows, sections, toggles, and sticky save bar.
- Backend appears responsive (forms loaded `/api/accounts` data without 500).
- Existing flows untouched: Dashboard "Income" quick-action, /transactions/add income mode, navigation, all other modules.



### Session 23 — New Income Module (2026-02)
**User asked: remove old Income flow + build new Income module (Dashboard / Add / Analytics / Sources / Recurring). Reuse existing backend, accounts, categories, members, reminders. Do not modify Dashboard, Transactions, Investments, Budget, Loans or navigation structure.**

User's uploaded "reference designs" were all Insights screens — no actual Income references existed. After clarifying via ask_human and user said "Continue", I built Income module from scratch matching the existing dark-purple theme + the polished card/tabs language from Insights.

#### Backend (zero changes — reused existing)
- `POST/GET/PUT/DELETE /api/income` (server.py lines 1258-1450)
- `GET /api/analytics/income-breakdown?month=&year=` (server.py lines 2184-2214)
- `IncomeCreate` already supports `labels: List[str]` — used as `["recurring", "freq:<frequency>"]` to mark recurring entries (no schema changes needed)
- Account-balance auto-adjust on POST/PUT/DELETE is preserved

#### Frontend — 5 net-new screens under `/app/frontend/app/income/`
- `index.tsx` (~340 lines) — Income Dashboard: month navigator → purple-gradient Total Income hero with Entries/Avg-per-Entry/Sources stat strip → 4 action shortcut cards (Add/Recurring/Sources/Analytics) → By-Source donut chart with legend → Recent Entries list (5 rows, tap → edit). Pull-to-refresh + FAB.
- `add.tsx` (~390 lines) — Standalone Add / Edit Income flow: purple gradient amount hero with rupee input → Source/Payer text → horizontal-scrollable Category chips (8 INCOME_CATEGORIES) → dynamic sub-category chips per selected category → Account selector (chips from `/api/accounts` with account-type color tint + balance) → optional Family Member chips (from `/api/family-members`) → Recurring toggle revealing frequency chips (monthly/weekly/bi-weekly/quarterly/yearly) → notes textarea → sticky gradient Save button. Edit mode via `?id=<income_id>` loads existing income, shows Delete button. Recurring stored as `labels: ['recurring', 'freq:monthly']`.
- `analytics.tsx` (~290 lines) — Income Analytics: period tabs (month/quarter/year) → purple-gradient hero with growth-% pill vs previous period → 6-month BarChart (gifted-charts) of monthly income → By-Source donut + category list with percent pills → Top Sources list with rank badges (#1, #2…). Aggregation is client-side from `/api/income?start_date=&end_date=`.
- `sources.tsx` (~180 lines) — Income Sources view: green-gradient This Month summary card → all 8 INCOME_CATEGORIES listed with current-month total / entry count / avg-per-entry + last-entry date + animated progress bar showing share of total. Empty categories rendered dimmed for affordance to add.
- `recurring.tsx` (~190 lines) — Recurring Income: filters `/api/income` (last 180 days) by `labels.includes('recurring')`, groups by source, computes next-due date per frequency. Hero shows Monthly Equivalent (normalizes weekly → ×4.33, biweekly → ×2.17, quarterly → ÷3, yearly → ÷12). Each row has a colored due-pill (red overdue / orange ≤7 days / green future).

#### Single line modified outside `/app/frontend/app/income/` (in scope per user rules)
- `/app/frontend/app/(tabs)/analytics.tsx` — added optional `onViewAll` prop to `TrendCard` and wired the Income Trend card's "View All →" to `router.push('/income')`. Expense / Investment cards unchanged. (Insights is NOT in the user's do-not-modify list.)

#### Constraints honoured
- ✅ Dashboard `Income` quick-action **not touched** (still routes to legacy `/transactions/add?type=income` — needs user permission to repoint).
- ✅ `/transactions/add` `income` mode toggle **not touched** (still functional for legacy entry).
- ✅ Bottom-tab navigation **not touched**.
- ✅ Investments / Budget / Loans **not touched**.
- ✅ Backend / Firestore schema **not touched**.

#### Validation status
- Webpack bundles cleanly. `/income` and `/income/add` screens rendered correctly in screenshot (purple gradient, all chips, empty states, sticky save bar).
- Testing agent created `/app/backend/tests/test_income_module.py` (14 tests covering full CRUD + balance adjustments + recurring labels persistence + analytics shape).
- ⚠️ **Tests SKIPPED** — Firebase Firestore Spark-plan quota exhausted (recurring blocker, same as iteration_24). Auto-resets midnight Pacific.
- ⚠️ Earlier screenshot-test of `/income/add` showed account chips fetching correctly — quota burned again during testing-agent's heavy probing.



### Session 22 — Insights UI Polish (2026-02)
**User asked: improve UI of Insights module only (card spacing, charts, typography, tabs, progress bars, responsive). Maintain existing theme + navigation + structure. Do not touch backend / dashboard / navigation.**

Changes (style-only, no logic changes):
- **Main tab bar** (`(tabs)/analytics.tsx` `st.*` + render): active pill fully rounded (`borderRadius: 999`) with `shadowColor: PURPLE_DARK` drop shadow + `elevation: 4`; inactive pill gets a soft background tint so it reads as a ghost-button; bigger label (12 → 13, weight 700, letter-spacing 0.1); larger horizontal padding (14 → 16) and bigger gap (6 → 8). Added a subtle subtitle below the "Insights" title showing the current period ("May 2026 · your money at a glance").
- **Period chips** (all 4 tabs cf/sp/bd/tr + both detail screens): `paddingVertical 9 → 10`, `borderRadius 10 → 11`, label `12 → 13` with letter-spacing 0.1, `marginBottom 14 → 16`.
- **Cards** (all 4 tabs + 2 detail screens): standardized `borderRadius 16 → 18`, `padding 16 → 18`, `marginBottom 14 → 16` so every card breathes the same way and headlines line up across tabs. `cl.gridCard` calendar card padding 12 → 14.
- **Typography**: `sectionTitle` weight 700 → 800 with `letter-spacing: -0.2`; `cashValue` 30 → 32 with `-0.6` tracking; `metricValue` 18 → 19 with `-0.4` tracking; `metricLabel` becomes uppercase 11px tracking-0.4 for clearer hierarchy; trend `cardValue` 22 → 24 / `-0.6`; calendar `summaryTitle` 15 → 16 / 800; "View All" / "View Details" buttons go to weight 800 + letter-spacing 0.2 for affordance.
- **Progress bars**: `ProgBar` default height 6 → 7 with a thin `rgba(255,255,255,0.22)` highlight strip across the top of the fill for soft 3-D depth. Cash-flow In-vs-Out stacked bar 12 → 14. Detail-screen hero stacked bar 8 → 10.
- **Pills**: deltaPill, txnBadge, ratePill all switched to full-round (`borderRadius: 999`) for a more modern look.
- **Header**: Insights screen header height 14 → 16; title 26 → 28; settings button 34 → 38.
- Webpack rebundled cleanly after every edit. No backend / navigation / dashboard touched.

⚠️ Visual validation against real Insights data **blocked** — Firebase Firestore Spark-plan daily quota still exhausted (every protected API returns 500). Landing page renders. Polish edits are pure CSS-token tweaks, so they will appear automatically when the quota resets at midnight Pacific.


### Session 21 — Insights Detail Screens Wired to Real Data (2026-02)
**User asked: connect Insights screens (Transactions / Budget / Investments) and add calculations for monthly income, monthly expenses, savings rate, net cash flow, category spending, budget utilization, trend analysis. No external APIs, no unrelated module changes.**

- Main Insights screen (`/app/frontend/app/(tabs)/analytics.tsx`) was overwritten by a prior session to wire all 6 tabs (Overview, Cash Flow, Spending, Budget, Trends, Calendar) to `/api/insights/*` — webpack compiled cleanly. End-to-end runtime validation pending (see below).
- **Rewrote** `/app/frontend/app/insights/cashflow-details.tsx` — was 100% dummy, now calls `GET /api/insights/cashflow?period=month|quarter|year`, maps `inflow_by_source` + `outflow_by_category` to category rows with icon/color from a shared `CAT_CONFIG`, period tabs refetch, hero card uses real `totals.net / in_share_pct / out_share_pct`, graceful loading + empty states.
- **Rewrote** `/app/frontend/app/insights/spending-by-category.tsx` — was 100% dummy, now calls `GET /api/insights/spending?period=...`, donut + 6-category breakdown + per-category top-merchants (filtered from `top_merchants[]` by category) all from real data, period tabs refetch, loading + empty states.
- Backend (no changes) already exposes all 7 calculations the user asked for via the `insights_router` package shipped in Session 20.
- New pytest suite `/app/backend/tests/test_insights_v2_endpoints.py` covers the v2 endpoint shapes (18 tests) — **BLOCKED** at run-time by Firebase Firestore Spark-plan daily quota (429 RESOURCE_EXHAUSTED). Resets midnight Pacific Time. Re-run command stored in `test_credentials.md`.



### Session 20 — Scalable Insights Analytics Backend (2026-05-14)
**Refactored `/app/backend/insights.py` (346 lines, monolithic) into a modular package `/app/backend/insights/`.**

#### New structure
```
/app/backend/insights/
├── __init__.py             — combines all 6 routers into `insights_router`
├── periods.py              — DateRange, Period (month/quarter/year), helpers
├── service.py              — shared data-access + math helpers
├── financial_summary.py    — /api/insights/financial-summary  + /overview (legacy)
├── cashflow.py             — /api/insights/cashflow  + /cashflow/monthly-trend
├── spending.py             — /api/insights/spending  + /spending/category/{cat}  + /spending-trend (legacy)
├── budget.py               — /api/insights/budget  + /budget-status (legacy)
├── trends.py               — /api/insights/trends
└── calendar.py             — /api/insights/calendar
```

#### What changed
- **Zero new collections.** Reuses `db.income`, `db.expenses`, `db.budgets`, `db.investments`, `db.accounts`.
- **Period-aware endpoints** — every analytics endpoint now accepts `period=month|quarter|year` with proper date-range math (quarter = 3 calendar months, year = full calendar year).
- **Previous-period comparison** (`previous_range`) — automatic %-change computation against the same-length prior window.
- **All 4 legacy endpoints preserved** (`/insights/overview`, `/insights/budget-status`, `/insights/spending-trend`, `/insights/calendar`) — zero frontend breakage.
- **6 new endpoints** added matching the 6 analytics types the redesigned Insights tabs need:
  - `/insights/financial-summary` — period income / expenses / savings / accounts / over-budget
  - `/insights/cashflow` — inflow by source, outflow by category, per-account flow
  - `/insights/cashflow/monthly-trend` — N-month series for bar chart
  - `/insights/spending` — categories + top merchants + avg/day
  - `/insights/spending/category/{cat}` — drill-down: every txn + merchant subtotals
  - `/insights/budget` — period-scaled limits (×3 quarter, ×12 year), over-budget list, days-left
  - `/insights/trends` — Income/Expense/Investment 3-series for the Trends-tab cards
- All 10 endpoints verified live (HTTP 401 unauth, 200 with token) — backend running.
- Lint clean (ruff). No frontend changes — all `/api/insights/*` callers continue to work.

### Session 19 — Drill-down Screens (2026-05-14)
**New drill-down screens for Insights tab "View Details" / "View All" CTAs**

#### Cash Flow Details — `/app/frontend/app/insights/cashflow-details.tsx`
- Wired from all 3 "View Details" CTAs on the Cash Flow tab.
- Header → Period Tabs (Month/Quarter/Year) → Net Cash Flow gradient hero with Inflow/Outflow ratio bar → Total Inflow & Outflow stat row → Cash In group (Salary, Freelance, Other Income) → Cash Out group (Food, Transport, Shopping, Bills, Others) → Footer summary (totals + Net).

#### Spending by Category — `/app/frontend/app/insights/spending-by-category.tsx`
- Wired from the "View All" CTA on the Spending tab's category list.
- Header → Period Tabs → Big donut card (108r/74ir) with center "Total Spending ₹X" + vs-last delta + 2-col legend → "Category Breakdown" section header → 6 category cards (Food / Transport / Shopping / Entertainment / Bills / Others). Each card shows: tinted icon, name, txns count + avg, amount, color-tinted % pill, color-coded progress bar, and top-merchants pill row. Footer: purple-gradient summary card with total, category count, txn count.
- Constraint honoured: UI-only, dummy data per period, zero backend changes.

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
- [x] Insights: Wire dummy Overview UI + Investment Returns to real backend data — *analytics.tsx all 6 tabs wired to `/api/insights/*`, plus both detail screens (cashflow-details, spending-by-category) rewired this session (2026-02)*
- [ ] Insights: Refactor `analytics.tsx` (~1500 lines) → split tabs into `components/analytics/*.tsx`
- [ ] Insights: Firestore read caching in `/app/backend/insights/service.py` — `cashflow/monthly-trend` issues 12 reads/call, full Insights page-load can hit 30+ Firestore reads and burns Spark-plan quota
- [ ] Insights: "What if" savings rate simulator (increase income by X% → savings?)
- [ ] Insights: Export month summary as PDF/image

### P2 — Future
- [ ] Loans: Foreclosure date estimator
- [ ] Loans: Refinancing calculator
- [ ] Bills: Re-expose in navigation (currently hidden — only accessible via direct route)
