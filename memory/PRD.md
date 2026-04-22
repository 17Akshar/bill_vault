# Fintracker - Product Requirements Document

## App Overview
Fintracker is a Production-Ready Personal Finance & Wealth Management OS. It evolved from the Bill Tracker app to provide comprehensive financial tracking, portfolio management, and wealth overview capabilities.

## Phase 1: Fintracker Branding & UI Overhaul (COMPLETED)

### Landing Page (index.tsx)
- Fintracker logo with gradient background
- "Your Personal Finance & Wealth OS" tagline
- Feature cards grid: Net Worth, Investments, Accounts, Reminders
- Gradient "Get Started" CTA + "Create Account" button
- Animated fade-in entrance

### Dashboard (dashboard.tsx)
- User avatar with initials in header
- Greeting with name
- Purple gradient Net Worth hero card with sparkline chart
- Quick actions: Income, Expense, Transfer, Note
- Income/Expenses/Savings summary row
- Horizontal scrollable accounts section
- Investment donut chart with portfolio allocation
- Recent transactions feed
- Upcoming reminders
- Financial Hub quick nav grid

### Financial Hub (bills.tsx → Hub tab)
- Overdue bills alert banner
- Quick stats: Total, Upcoming, Paid
- Module grid: Bills, Credit Cards, Loans & EMI, Investments, Rentals, Lent/Borrowed, Budgets, Net Worth, Reports, Reminders
- Recent bills list

### Tab Navigation (_layout.tsx)
- 5 tabs: Home | Transactions | Accounts | Hub | Profile
- Active tab highlight with background tint
- Filled/outline icon toggle on selection

### Profile (profile.tsx)
- Purple gradient profile header card with avatar
- Color-coded preferences with icons
- Management section: Family, Analytics, Categories, Budgets
- Data & Storage section with export + sync status
- Outline logout button

### Auth Screens
- Updated to Fintracker branding (wallet icon, taglines)
- Login: "Sign in to Fintracker"
- Register: "Join Fintracker today"

### Theme (ThemeContext.tsx)
- Primary: #5B2FBF (purple)
- Dark mode default with rich dark backgrounds
- Light mode available

## Phase 2: Unified Accounts System (COMPLETED)
- Added `ownership_type` field: individual, joint, business
- Added `institution` field for bank name/wallet provider
- Added `wallet` as new account type
- Added `color` and `icon` customization fields
- Updated Add Account screen with ownership selector + institution input
- Backend models, create, and update endpoints all upgraded
- Backward compatible with existing accounts

## Phase 3: MPIN Authentication (COMPLETED)
- Backend: /api/mpin/setup, /api/mpin/verify, /api/mpin/status, /api/mpin/disable
- Frontend: Full MPIN setup screen with numpad, 4-digit PIN entry + confirmation
- Status badge showing enabled/disabled
- Disable MPIN option
- Accessible from Profile > Management > MPIN Security

## Phase 4: Calendar System (COMPLETED)
- Backend: /api/calendar/events endpoint aggregating bills, income, expenses, reminders
- Frontend: Full calendar view with month navigation
- Color-coded event dots on dates (green=income, yellow=expense, red=bill, purple=reminder)
- Today highlight and date selection
- Event details panel showing all events for selected date
- Legend bar for event types
- Accessible from Profile + Financial Hub

## Phase 5: Offline-First Architecture (UPCOMING)
- Replace "Family Members" with unified `account_id`
- Support Individual/Joint/Business accounts
- Banks, Wallets, Credit Cards

## Phase 3: Offline-First Architecture (UPCOMING)
- Local storage (SQLite/WatermelonDB)
- Sync queue layer
- Google Drive / OneDrive sync

## Phase 4: Enhanced Authentication (UPCOMING)
- MPIN login
- Mobile + OTP

## Phase 5: Offline-First Architecture (UPCOMING)
- Local storage (SQLite/WatermelonDB)
- Sync queue layer
- Google Drive / OneDrive sync

## Phase 6: Notes & Reminders Engine (COMPLETED)
- Backend: Full CRUD for `/api/notes` with sections/subheadings, tags, priority, color, linked entities
- Frontend: 2-column grid layout with search, sections editor, tag selector, priority & color picker
- Accessible from Dashboard + Financial Hub

## Phase 7: Financial Hub Upgrades (COMPLETED)
- Portfolio Analytics API: `/api/portfolio/analytics` with ROI%, CAGR%, type breakdown, allocation %
- Investment screen enhanced with allocation breakdown chips in summary
- New asset classes: ESOP, Bonds (12 total investment types)
- ROI label in portfolio summary

## Phase 8: Backend Modularization (UPCOMING)
- Break server.py into modular routers
- /routers/auth.py, /routers/transactions.py, etc.
