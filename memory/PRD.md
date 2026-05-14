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

### Session 1–13 (pre-existing)
- Auth (Firebase + JWT)
- Dashboard with net worth, accounts, transactions
- Income & Expense tracking
- Bills & reminders
- Investments module
- Budget module
- Credit cards, Rentals, Lending
- Reports & Insights
- Family members
- Push notifications (expo-notifications)

### Session 14 — Loans & EMIs Schema (2026-05-14)
**Scalable database architecture for Loans & EMIs feature**

#### New Collections
| Collection | Module | Purpose |
|---|---|---|
| `loans` | `loans.py` | Enhanced loan records with amortization metadata |
| `loan_transactions` | `loan_transactions.py` | Per-payment history (principal + interest split) |
| `emi_reminders` | `emi_reminders.py` | Per-EMI schedule rows + bridge to reminders |
| `loan_prepayments` | `loan_prepayments.py` | Part-prepayment / full-closure records |

#### Key Features
- EMI auto-computation (reducing balance & flat rate)
- Full amortization schedule generation
- Loan status lifecycle: active → closed / prepaid / transferred
- EMI reminders bridged to existing `reminders` collection (no notification duplication)
- Prepayment impact: penalty, new EMI, revised tenure
- Firestore ID registry updated with `loan_transaction_id`, `emi_reminder_id`, `prepayment_id`

### Session 15 — Loans & EMIs Calculations + UI Redesign (2026-05-14)
**Analytics engine + polished UI for Loans & EMIs module**

#### Backend: `GET /api/loans/{loan_id}/analytics`
Returns 7 live calculations from actual transaction data:
1. **Outstanding balance** — from loan record (updated by each transaction)
2. **EMI tracking** — emis_paid, emis_remaining, next_emi_date, tenure
3. **Interest paid** — sum of `interest_component` from EMI transactions
4. **Interest remaining** — projected via amortization on current balance
5. **Loan completion %** — `principal_paid / principal_amount × 100`
6. **Prepayment impact** — total_prepaid, penalty_paid, tenure_saved_months
7. **Interest saved** — `original_total_interest − (interest_paid + interest_remaining)`
- Also returns: payment_breakdown (principal vs interest %), total loan cost

#### Frontend: `loans/index.tsx` — Complete redesign
- **Portfolio summary card** (purple gradient) — Total Outstanding, Monthly EMI, Total Principal, Avg. Repaid %
- **Loan cards** — Type icon + status badge, stat pills (Outstanding / EMI / Repaid %), animated progress bar, Next EMI date + Remind button
- **Expandable analytics panel** — 4 sections: Loan Completion, Interest Analytics, EMI Tracking, Payment Breakdown (+ Prepayment Impact when applicable)
- **Add Loan modal** — 9 loan type chips, auto-compute EMI hint, full form with validation
- Existing app theme (dark/light), navigation, and architecture fully preserved

---

## API Surface — Loans Module
```
POST   /api/loans                              Create loan
GET    /api/loans                              List loans (with optional ?status= filter)
GET    /api/loans/summary                      Portfolio summary
GET    /api/loans/{loan_id}                    Single loan
GET    /api/loans/{loan_id}/analytics          7 live calculations
GET    /api/loans/{loan_id}/amortization       Full schedule
PUT    /api/loans/{loan_id}                    Update mutable fields
POST   /api/loans/{loan_id}/close              Close / mark prepaid
DELETE /api/loans/{loan_id}                    Soft-delete

POST   /api/loans/{loan_id}/transactions       Record EMI / prepayment
GET    /api/loans/{loan_id}/transactions       Loan payment history
GET    /api/loan-transactions                  All transactions across loans
PUT    /api/loan-transactions/{txn_id}         Correct notes / reference
DELETE /api/loan-transactions/{txn_id}         Delete + reverse counters

POST   /api/loans/{loan_id}/emi-schedule       Generate / regenerate EMI schedule
GET    /api/loans/{loan_id}/emi-schedule       List EMI schedule rows
GET    /api/loans/{loan_id}/emi-schedule/{n}   Single EMI row
PUT    /api/emi-reminders/{id}                 Mark EMI paid / overdue / skipped
DELETE /api/emi-reminders/{id}                 Remove EMI row
GET    /api/emi-reminders/upcoming             Upcoming EMIs across all loans

POST   /api/loans/{loan_id}/prepayments        Record prepayment
GET    /api/loans/{loan_id}/prepayments        Loan prepayment history
GET    /api/loan-prepayments                   All prepayments across loans
GET    /api/loan-prepayments/{id}              Single prepayment
PUT    /api/loan-prepayments/{id}              Correct notes / reference
DELETE /api/loan-prepayments/{id}              Delete + reverse balance
```

---

## Prioritized Backlog

### P0 — Core flows remaining
- [ ] EMI schedule UI (list view per loan showing all 240 rows with status)
- [ ] Record EMI payment from UI (mark EMI as paid, link to transaction)
- [ ] Prepayment entry form in UI

### P1 — Enhancements
- [ ] Loan detail screen (full-page) vs modal expand
- [ ] Amortization schedule viewer (paginated table)
- [ ] Loan comparison tool (two loans side by side)
- [ ] Overdue EMI detection and badge on dashboard

### P2 — Future
- [ ] Bank statement import for automatic EMI matching
- [ ] Refinancing calculator (what if I switch lender?)
- [ ] Loan foreclosure date estimator
