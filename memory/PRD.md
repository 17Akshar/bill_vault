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

## What's Been Implemented (2026-02-13)

### Backend (`/app/backend/loans.py`) — Full Enhancement
- **Extended loan model** with new fields: `lender`, `account_number`, `interest_type` (fixed/floating), `emi_day`, `processing_fee`, `other_charges`, `linked_account_id`, `status`, `tenure_years`
- **GET /api/loans/dashboard** — Summary stats (total outstanding, total paid, total interest, monthly EMI)
- **POST /api/loans** — Create loan with all new fields
- **GET /api/loans** — List all active loans
- **GET /api/loans/{id}** — Get single loan detail
- **PUT /api/loans/{id}** — Update loan
- **DELETE /api/loans/{id}** — Soft-delete loan
- **POST /api/loans/{id}/prepayment** — Record prepayment with interest savings calculation
- **GET /api/loans/{id}/transactions** — Get EMI payments + prepayments
- **POST /api/loans/{id}/transactions** — Mark EMI as paid

### Firebase Config (`/app/backend/firebase_config.py`)
- Added `prepay_id` and `loan_txn_id` to the doc-id preference list

### Frontend Screens
| Screen | File | Status |
|--------|------|--------|
| LoansDashboardScreen | `app/loans/index.tsx` | ✅ Built |
| AddLoanScreen | `app/loans/add.tsx` | ✅ Built |
| LoanDetailScreen | `app/loans/[id].tsx` | ✅ Built |
| PrepaymentScreen | `app/loans/prepayment.tsx` | ✅ Built |
| EMIReminderScreen | `app/loans/reminder.tsx` | ✅ Built |
| LoanTransactionScreen | `app/loans/transactions.tsx` | ✅ Built |

### More Tab (`app/(tabs)/profile.tsx`)
- Added **Loans & EMIs** as the first item in the Management section

---

## Screen Designs

### LoansDashboardScreen
- Header: "Loans & EMIs" + "+ Add Loan" button
- 4 stat cards (2×2 grid): Total Outstanding (purple), Total Paid (green), Total Interest (orange), Monthly EMI (blue)
- Sortable loan list (by Next EMI Date / Outstanding / Name)
- Loan cards with type icon, lender, status badge (Active/Closed/Paused), outstanding balance, EMI amount, next EMI date, progress bar (% repaid)
- 3-dot context menu: View Details, Prepayment, Set Reminder, Transactions, Delete
- Empty state with "Add Your First Loan" CTA

### AddLoanScreen
- Loan Type chips (8 types: Home, Car, Personal, Education, Gold, Business, Property, Two-Wheeler, Other)
- Lender/Bank modal picker (20+ Indian banks)
- Date of Loan Taken (CrossPlatformPicker) + Loan Tenure (dropdown: 1-30 years)
- Total Loan Amount, Interest Rate, Rate Type (Fixed/Floating)
- EMI Amount + EMI Day (day of month picker)
- Processing Fee, Other Charges (optional)
- Linked Account, Notes (optional)
- "EMI will be tracked automatically" info banner
- Save Loan button

### LoanDetailScreen
- Hero card with type color, name, lender, status, outstanding, EMI, progress bar
- Action buttons: Mark EMI Paid, Prepayment, Set Reminder, History
- Loan details section (full data)
- Repayment summary with progress bar
- Recent activity (last 5 transactions)

### PrepaymentScreen
- Outstanding balance display
- Prepayment Amount + Date input
- Option: Reduce Tenure or Reduce EMI
- Live calculation: Interest Saved, New Tenure/EMI, New End Date
- Proceed button (calls API and updates balance)

### EMIReminderScreen
- Payment / Custom reminder type radio
- Reminder Date (CrossPlatformPicker) + Time picker
- Repeat: One Time / Daily / Weekly / Monthly
- Optional recurring end date
- Reuses existing `/api/reminders` endpoint with `loan_emi` type
- Preview of reminder

### LoanTransactionScreen
- Tabs: All / EMI Payments / Prepayments
- Summary strip: Outstanding, EMI/month, Transactions count
- Transaction cards with icon, date, amount
- "Mark EMI" button → modal with amount + date confirmation

---

## Test Results (Iteration 21)
- **Backend:** 100% (11/11 tests passed)
- **Frontend:** 90% (all screens load + work; native alert dialogs not testable via Playwright)
- No breaking changes to existing modules

---

## Prioritized Backlog

### P0 (Critical — already done)
- [x] More → Loans & EMIs navigation
- [x] All 6 screens created and functional
- [x] Backend APIs with full CRUD + dashboard + prepayment + transactions

### P1 (High value, next)
- [ ] Edit Loan screen (update existing loan details)
- [ ] EMI schedule calculator (show projected future EMIs)
- [ ] Mark multiple EMIs as paid at once
- [ ] Dashboard Loans widget integration

### P2 (Nice to have)
- [ ] Loan comparison tool
- [ ] Export loan statement (PDF/CSV)
- [ ] Loan closure flow (mark as closed when outstanding = 0)
- [ ] Interest type change tracking (for floating rate loans)
- [ ] 3-dot menu as custom modal instead of native Alert.alert for better web UX

---

## Notes
- Dashboard, Transactions, Investments, Budget modules were NOT modified
- Existing navigation structure preserved
- CrossPlatformPicker reused for all date inputs
- Existing reminders API reused for EMI reminders (type: `loan_emi`)
