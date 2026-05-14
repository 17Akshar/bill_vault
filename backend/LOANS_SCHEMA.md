# Loans & EMIs — Database Schema

> **Source of truth:** `backend/models/loans.py`
> **Index hints:** `firestore.indexes.json`

The Loans & EMIs feature is backed by **three dedicated collections** plus
**reuse** of the existing `reminders` and `users` collections. Nothing
about the existing `transactions` (Income/Expense) module is changed.

---

## Architecture Overview

```
┌───────────────┐       ┌──────────────────────┐
│    users      │──┐    │ reminders            │  (existing)
│ user_id (PK)  │  │    │ reminder_id (PK)     │
└───────────────┘  │    │ user_id (FK)         │
                   │    │ reminder_type        │  ── 'loan_emi'
                   │    │ related_id (FK→loans)│
                   │    └──────────────────────┘
                   │
                   ▼
┌──────────────────────────┐
│ loans                    │
│ loan_id (PK)             │
│ user_id (FK)             │──┐
│ outstanding, emi, rate…  │  │
│ total_paid, last_pay_dt  │  │
└──────────────────────────┘  │
       ▲                      │
       │                      │
   ┌───┴────────────┐    ┌────┴──────────────┐
   │ loan_transactions │    │ loan_prepayments  │
   │ loan_txn_id (PK)  │    │ prepay_id (PK)    │
   │ loan_id (FK)      │    │ loan_id (FK)      │
   │ amount            │    │ amount, type      │
   │ principal_paid    │    │ new_outstanding   │
   │ interest_paid     │    │ new_emi           │
   │ outstanding_after │    │ interest_saved    │
   └───────────────────┘    └───────────────────┘
```

---

## Collections

### 1. `loans`
| Field                  | Type     | Notes                                   |
|------------------------|----------|-----------------------------------------|
| `loan_id`              | string   | **PK** — `loan_<12hex>`                 |
| `user_id`              | string   | FK → `users.user_id`                    |
| `name`                 | string   | Display name                            |
| `loan_type`            | enum     | `home / car / personal / education / gold / business / property / vehicle / other` |
| `lender`               | string?  | Bank / NBFC name                        |
| `account_number`       | string?  |                                         |
| `principal_amount`     | number   | Original loan amount                    |
| `outstanding_amount`   | number   | Live balance — updated by EMI/prepay    |
| `interest_rate`        | number   | % per annum                             |
| `interest_type`        | enum     | `fixed / floating`                      |
| `emi_amount`           | number   | Monthly EMI                             |
| `emi_day`              | int?     | 1-31                                    |
| `tenure_months`        | int?     |                                         |
| `tenure_years`         | number?  |                                         |
| `processing_fee`       | number   | Default 0                               |
| `other_charges`        | number   | Default 0                               |
| `total_paid`           | number   | **NEW** running sum of all payments     |
| `total_principal_paid` | number   | **NEW** running principal               |
| `total_interest_paid`  | number   | **NEW** running interest                |
| `last_payment_date`    | datetime?| **NEW** last EMI/prepayment timestamp   |
| `closed_date`          | datetime?| **NEW** set when status auto-flips to `closed` |
| `start_date`           | datetime | Loan disbursal date                     |
| `next_emi_date`        | datetime?| Auto-rolls +1 month on each EMI         |
| `linked_account_id`    | string?  | FK → `accounts.account_id` (optional)   |
| `family_member_id`     | string?  | FK → `family_members.family_member_id`  |
| `notes`                | string?  |                                         |
| `status`               | enum     | `active / paused / closed`              |
| `is_active`            | bool     | Soft-delete flag                        |
| `created_at`           | datetime |                                         |
| `updated_at`           | datetime |                                         |

### 2. `loan_transactions`
Each row represents a single EMI / partial payment.

| Field               | Type     | Notes                                   |
|---------------------|----------|-----------------------------------------|
| `loan_txn_id`       | string   | **PK** — `ltxn_<10hex>`                 |
| `loan_id`           | string   | FK → `loans.loan_id`                    |
| `user_id`           | string   | Auth scope                              |
| `amount`            | number   | Gross paid                              |
| `principal_paid`    | number   | **Server-computed**                     |
| `interest_paid`     | number   | **Server-computed**                     |
| `outstanding_after` | number   | Balance immediately after this row      |
| `payment_date`      | datetime |                                         |
| `payment_type`      | enum     | `emi / partial / prepayment`            |
| `notes`             | string?  |                                         |
| `created_at`        | datetime |                                         |

### 3. `loan_prepayments`
| Field               | Type     | Notes                                   |
|---------------------|----------|-----------------------------------------|
| `prepay_id`         | string   | **PK** — `prepay_<10hex>`               |
| `loan_id`           | string   | FK → `loans.loan_id`                    |
| `user_id`           | string   | Auth scope                              |
| `amount`            | number   |                                         |
| `date`              | datetime |                                         |
| `prepayment_type`   | enum     | `reduce_tenure / reduce_emi`            |
| `new_outstanding`   | number   | Computed at write-time                  |
| `new_emi`           | number   | Same as before for `reduce_tenure`      |
| `remaining_months`  | int      |                                         |
| `interest_saved`    | number   | Projected savings                       |
| `notes`             | string?  |                                         |
| `created_at`        | datetime |                                         |

### 4. EMI Reminders — REUSES `reminders` collection
We do **not** create a separate collection.

| Field           | Constraint for EMI reminders            |
|-----------------|-----------------------------------------|
| `reminder_type` | Must be `loan_emi`                      |
| `related_id`    | Must be a `loans.loan_id`               |
| `title`         | Convention: `EMI Due — <loan name>`     |
| `recurrence`    | `none / daily / weekly / monthly`       |
| `end_type`      | `never / on / after`                    |

All other reminder fields (`is_completed`, `snooze_until`,
`max_occurrences`, etc.) work identically to other reminder types.

---

## What's reused, NOT duplicated

| Concern               | Reused from                          |
|-----------------------|--------------------------------------|
| Authentication        | `server.get_current_user()`          |
| Users                 | Existing `users` collection          |
| Reminders             | Existing `reminders` collection      |
| Notifications         | `utils/reminderNotifications.ts`     |
| Income/Expense        | **Untouched** — loans never write there |
| Budget                | **Untouched**                        |

---

## Scalability

### Server-computed write-time aggregates
Storing `principal_paid` / `interest_paid` / `outstanding_after` on every
EMI row, and `total_paid` / `total_principal_paid` / `total_interest_paid`
/ `last_payment_date` on the loan row, lets the client render history
and aggregates with a single read each — no client-side amortisation
walk required.

### Auto-close
When `outstanding_amount` drops to ≤ 0 (via EMI or prepayment),
the loan automatically flips to `status='closed'` and stamps
`closed_date`. Dashboards filter on `is_active` AND `status`.

### Composite indexes
See `firestore.indexes.json`. Key combos:

* `loans (user_id, is_active)`        — dashboard list
* `loans (user_id, next_emi_date)`    — upcoming-EMIs strip
* `loan_transactions (loan_id, payment_date DESC)` — history pagination
* `loan_prepayments  (loan_id, date DESC)`         — history pagination
* `reminders (related_id, reminder_type)`          — per-loan reminders

Deploy via `firebase deploy --only firestore:indexes`.

---

## Migration notes
- Existing loan rows (created before this change) lack the new tracking
  fields. They are read as `None` / `0.0` defaults via Pydantic and
  populated on the next write operation (`PUT /api/loans/{id}` or any
  EMI/prepayment). No migration script required.
- Existing `loan_transactions` rows without `principal_paid` /
  `interest_paid` / `outstanding_after` are still rendered by the
  frontend via client-side fallback (see `buildTimeline()` in
  `app/loans/transactions.tsx`).
