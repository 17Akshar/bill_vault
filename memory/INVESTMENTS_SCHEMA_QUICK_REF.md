# Investments Database Schema — Quick Reference
**Version:** 2.0 — 2026-05-11

---

## Collections

```
┌─────────────────────────────────────────────────────┐
│               INVESTMENTS MODULE                     │
└─────────────────────────────────────────────────────┘

┌──────────┐
│  USERS   │  (Existing — reused)
└────┬─────┘
     │ user_id (1:N)
     ▼
┌────────────────────────────────────────┐
│           INVESTMENTS                  │  ◄── Main table
│  investment_id  (PK)                   │
│  user_id        (FK → users)           │
│  name, investment_type                 │
│  invested_amount, current_value        │
│  purchase_date, maturity_date, status  │
│  linked_account, notes, documents      │
│  type_specific_data  { JSON }          │  ◄── category metadata
│  sale_details        { typed }         │  ◄── exit info
│  maturity_details    { typed }         │  ◄── maturity info
│  withdrawal_details  { typed }         │  ◄── NPS/EPF withdrawal
│  is_active, created_at, updated_at     │
└────────────────┬───────────────────────┘
                 │ investment_id (1:N)
                 ▼
┌────────────────────────────────────────┐
│       INVESTMENT_TRANSACTIONS          │  (unchanged)
│  transaction_id (PK)                   │
│  investment_id  (FK)                   │
│  user_id        (FK)                   │
│  transaction_type: buy|sell|div|…      │
│  amount, quantity, price_per_unit      │
│  brokerage_charges, transaction_date   │
└────────────────────────────────────────┘
```

---

## Detail Object Schemas

### sale_details  (market investments)
```json
{
  "date_of_sale": "ISO datetime",
  "units_sold": 100.0,
  "sold_nav": 130.0,
  "sale_price": 150.0,
  "amount_received": 13000.0,
  "tax_deducted": 300.0,
  "date_of_withdrawal": "ISO datetime"  // NPS backward compat
}
```

### maturity_details  (FD / RD / PPF / bonds)
```json
{
  "date_of_maturity": "ISO datetime",
  "maturity_amount": 107100.0,
  "amount_received": 106390.0,
  "tds_deducted": 710.0,
  "renewed": false,
  "renewal_investment_id": null
}
```

### withdrawal_details  (NPS / EPF / PPF partial)
```json
{
  "date_of_withdrawal": "ISO datetime",
  "withdrawal_type": "partial | full | premature | annuity",
  "amount_received": 120000.0,
  "annuity_amount": 72000.0,
  "lumpsum_amount": 48000.0,
  "tax_deducted": 5000.0
}
```

---

## Investment Types → Detail Object Mapping

| Type | sale_details | maturity_details | withdrawal_details |
|------|:---:|:---:|:---:|
| stocks | ✅ | — | — |
| mutual_funds | ✅ | — | — |
| etf | ✅ | — | — |
| reit | ✅ | — | — |
| bonds | ✅ | ✅ | — |
| fd | — | ✅ | — |
| corporate_deposit | — | ✅ | — |
| rd | — | ✅ | — |
| ppf | — | ✅ | ✅ (partial) |
| nps | ✅ (compat key) | — | ✅ |
| epf | — | — | ✅ |
| gold | ✅ | — | — |
| silver | ✅ | — | — |
| lic / insurance | — | ✅ | — |
| term_insurance | — | — | — |
| crypto | ✅ | — | — |
| others | ✅ | ✅ | ✅ |

---

## Status Values

| Status | Used by |
|--------|---------|
| `active` | All types — default |
| `closed` | Stocks, MF, ETF fully sold |
| `matured` | FD, RD, bonds, PPF on maturity date |
| `partially_sold` | Stocks, MF partial exit |
| `withdrawn` | NPS, EPF full withdrawal |
| `partially_withdrawn` | NPS, EPF partial withdrawal |

---

## Key API Endpoints

| Method | Path | Detail |
|--------|------|--------|
| POST | `/api/investments` | Create — accepts all 3 detail objects |
| GET | `/api/investments` | List (filter: type, status) |
| GET | `/api/investments/dashboard` | Portfolio summary + analytics |
| GET | `/api/investments/{id}` | Detail + metrics + transactions |
| PUT | `/api/investments/{id}` | Update — typed models, adds withdrawal_details |
| DELETE | `/api/investments/{id}` | Soft delete |
| POST | `/api/investments/{id}/transactions` | Add buy/sell/div transaction |
| GET | `/api/investments/{id}/transactions` | Transaction history |

---

## Pydantic Models

```python
SaleDetails(extra='allow')         # accepts any extra keys
MaturityDetails(extra='allow')
WithdrawalDetails(extra='allow')

InvestmentCreate:
  + sale_details: Optional[SaleDetails]
  + maturity_details: Optional[MaturityDetails]
  + withdrawal_details: Optional[WithdrawalDetails]   # NEW

InvestmentUpdate:
  ~ sale_details: Optional[SaleDetails]       # was Dict, now typed
  ~ maturity_details: Optional[MaturityDetails]  # was Dict, now typed
  + withdrawal_details: Optional[WithdrawalDetails]   # NEW
```

---

**Full schema:** `/app/memory/INVESTMENTS_DATABASE_SCHEMA.md`
**Backend:** `/app/backend/investments.py`
