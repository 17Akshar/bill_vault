# Fincare/BillVault — Loans & EMIs Feature PRD

## Original Problem Statement
Modify existing Fincare/BillVault application.
Add a new feature called "Loans & EMIs" inside the More section.

**Accessible via:** More → Loans & EMIs (first item in Management section)

---

## Tech Stack
- **Frontend:** React Native (Expo) + TypeScript + expo-router
- **Backend:** FastAPI (Python) + Firebase Firestore
- **Navigation:** expo-router with tabs + stack navigation
- **Auth:** Single-user mode (no login required for dev)

---

## What's Been Implemented

### 2026-02-13 — Phase 1 (Initial build)
- Backend `loans.py` with full CRUD + dashboard + prepayment + transactions
- All 6 frontend screens (Dashboard, Add, Detail, Prepayment, Reminder, Transactions)
- "Loans & EMIs" entry in More tab
- Iteration_21 → backend 100%, frontend 90%

### 2026-02-13 — Phase 2 (UX hardening + live data)
- **`loans/index.tsx`** — replaced dummy data with live `/api/loans` + `/api/loans/dashboard`. Added loading + empty state + pull-to-refresh + sort modal.
- **Custom 3-dot menu** (`ActionMenu`) — Modal-based bottom sheet replacing the native `Alert.alert` `ActionSheet`. 6 actions: View Details · Edit Loan · Prepayment · Set Reminder · Transactions · Delete Loan. Each fully testable via Playwright (`loan-action-*` testIDs).
- **Custom delete-confirm modals** on `loans/index.tsx`, `loans/add.tsx`, and `loans/[id].tsx` (testIDs `confirm-delete-{cancel,yes}`, `delete-{cancel,confirm}-btn`, `detail-delete-{cancel,confirm}`).
- **Compact INR formatting** for summary stat cards (`₹1.27Cr` / `₹12.7L`) — no more truncation at 420px viewport.
- **Auth-bootstrap race fix** — `utils/authReady.ts` shared one-shot promise gate; `api.ts` request interceptor awaits it before reading the token; 401 response now attempts a single re-auth via `/api/auth/single-user` and replays the original request before wiping the token.
- Iteration_22 → backend 100% (11/11), frontend 100% on regression items, one race issue found.
- Iteration_23 → race issue FIXED, frontend 100% (5/5).

---

## Screens
| Screen | File | Status |
|--------|------|--------|
| LoansDashboardScreen | `app/loans/index.tsx` | ✅ Live data + custom action menu |
| AddLoanScreen | `app/loans/add.tsx` | ✅ Save / Edit / custom Delete modal |
| LoanDetailScreen | `app/loans/[id].tsx` | ✅ Custom Delete modal + edit nav |
| PrepaymentScreen | `app/loans/prepayment.tsx` | ✅ UI-only with dummy calc matching reference (2026-02-13) |
| EMIReminderScreen | `app/loans/reminder.tsx` | ✅ Reuses `/api/reminders` |
| LoanTransactionScreen | `app/loans/transactions.tsx` | ✅ Mark EMI modal |

---

## Backend Endpoints (`/app/backend/loans.py`)
- `GET /api/loans/dashboard` — Summary stats
- `GET /api/loans` — List active loans
- `POST /api/loans` — Create loan
- `GET /api/loans/{id}` — Detail
- `PUT /api/loans/{id}` — Update
- `DELETE /api/loans/{id}` — Soft-delete
- `POST /api/loans/{id}/prepayment` — Record prepayment + interest savings
- `GET /api/loans/{id}/transactions` — EMI + prepayment history
- `POST /api/loans/{id}/transactions` — Mark EMI as paid

---

## Test Results
- Iteration_21: Backend 100% (11/11), Frontend 90%
- Iteration_22: Backend 100% (11/11), Frontend 100% (regression items) — 1 auth-race found
- Iteration_23: Frontend 100% (5/5) — auth race fixed, no regressions

---

## Prioritized Backlog

### P0 (Done)
- [x] More → Loans & EMIs navigation
- [x] All 6 screens functional
- [x] Backend CRUD + dashboard + prepayment + transactions
- [x] Custom 3-dot menu modal (no native Alert)
- [x] Custom delete-confirm modals
- [x] Live backend data on dashboard
- [x] Auth bootstrap race fix

### P1 (Next)
- [ ] Dashboard "Loans" widget integration on main tab
- [ ] Loan closure flow (auto-mark closed when outstanding ≤ 0)
- [ ] Mark multiple EMIs as paid at once
- [ ] EMI schedule calculator (project future EMIs)

### P2 (Nice-to-have)
- [ ] Loan comparison tool
- [ ] Export loan statement (PDF/CSV)
- [ ] Interest type change tracking (for floating rate loans)
- [ ] Start the authReady 5s safety-net timer from AuthContext mount rather than module import (minor)

---

## Notes
- Dashboard, Transactions, Investments, Budget modules were NOT modified
- Existing navigation structure preserved
- CrossPlatformPicker reused for all date inputs
- Existing reminders API reused for EMI reminders (type: `loan_emi`)
