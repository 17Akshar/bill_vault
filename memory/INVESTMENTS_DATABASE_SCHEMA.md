# Investments Database Schema
**Version:** 2.0 — Last Updated: 2026-05-11
**Status:** Live / In Production

---

## Architecture Overview

```
investments collection  ────────────────────────────────────────  Main table
  ├── Common fields          name, type, amounts, dates, status
  ├── type_specific_data     Flexible JSON per category
  ├── sale_details           Typed — market investment exits
  ├── maturity_details       Typed — FD/RD/PPF/bond maturity
  └── withdrawal_details     Typed — NPS/EPF/PPF partial/full

investment_transactions     Per-event records (buy/sell/div/…)
users                       Existing — reused via user_id FK
```

---

## 1. investments Collection  (Main Table)

### Common Fields (all investment types)

| Field | Type | Description |
|-------|------|-------------|
| `investment_id` | string | PK — `inv_` + 12-char hex |
| `user_id` | string | FK → users |
| `name` | string | Display name |
| `investment_type` | string | Category key (see supported types) |
| `invested_amount` | float | Total capital deployed |
| `current_value` | float | Current market / NAV value |
| `purchase_date` | datetime | First purchase / opening date |
| `maturity_date` | datetime? | Maturity / expiry (nullable) |
| `status` | string | `active \| closed \| matured \| partially_sold \| withdrawn \| partially_withdrawn` |
| `family_member_id` | string? | FK → family_members (nullable) |
| `notes` | string? | Free-text notes |
| `documents` | string[] | Attachment URLs |
| `linked_account` | string? | FK → accounts.account_id |
| `is_active` | bool | Soft-delete flag |
| `created_at` | datetime | Record creation timestamp |
| `updated_at` | datetime | Last modification timestamp |

### Category-Specific Metadata

```
type_specific_data: object   (flexible JSON — stored as-is)
```

Expected keys per `investment_type`:

| Type | Keys in `type_specific_data` | Detail Object Used |
|------|-----------------------------|--------------------|
| `stocks` | ticker, exchange, sector, quantity, avg_buy_price, current_price | sale_details |
| `mutual_funds` | folio_number, fund_house, scheme_type, units, nav | sale_details |
| `etf` | folio_number, exchange, tracking_index, units, nav | sale_details |
| `reit` | folio_number, exchange, reit_type, units, nav | sale_details |
| `fd` | bank, fd_number, interest_rate, tenure_months | maturity_details |
| `corporate_deposit` | issuer_name, interest_rate, tenure_months, scheme_type | maturity_details |
| `rd` | bank, monthly_installment, interest_rate, tenure_months | maturity_details |
| `bonds` | bond_type, face_value, quantity, purchase_price, coupon_rate, isin | sale_details + maturity_details |
| `ppf` | ppf_account_number, interest_rate | maturity_details |
| `nps` | pran, tier, asset_allocation | sale_details (withdrawal compat) |
| `epf` | uan, employee_share, employer_share | withdrawal_details |
| `gold` | quantity, purchase_price_per_unit, current_price_per_unit, purity | sale_details |
| `silver` | quantity, purchase_price_per_unit, current_price_per_unit, purity | sale_details |
| `lic` | policy_number, sum_assured, policy_status | maturity_details |
| `insurance` | policy_number, sum_assured, policy_status | maturity_details (alias of lic) |
| `term_insurance` | policy_number, sum_assured, nominee, policy_status | — (pure protection) |
| `crypto` | coin_symbol, wallet_type, quantity, avg_buy_price | sale_details |
| `esop` | grant_date, vesting_schedule, strike_price, quantity | sale_details |
| `private_equity` | company_name, round, stake_pct | sale_details |
| `aif` | fund_name, category, nav | sale_details |
| Others | Any key-value pairs | any |

### Sale Details  (market investments)

```
sale_details: object?   (null when investment is still active)
```

| Field | Type | Description |
|-------|------|-------------|
| `date_of_sale` | string? | ISO datetime — stocks / MF / ETF / REIT / bonds |
| `units_sold` | float? | Units / shares sold |
| `sold_nav` | float? | MF / ETF price per unit at sale |
| `sale_price` | float? | Bonds / stocks exit price per unit |
| `amount_received` | float? | Net sale proceeds |
| `tax_deducted` | float? | Capital-gains TDS withheld |
| `date_of_withdrawal` | string? | NPS backward-compat key (stored here by NPS form) |

> **Note:** `extra='allow'` on the Pydantic model means any additional keys are preserved.

### Maturity Details  (fixed-income investments)

```
maturity_details: object?   (null until investment matures)
```

| Field | Type | Description |
|-------|------|-------------|
| `date_of_maturity` | string? | ISO datetime — actual maturity / redemption date |
| `maturity_amount` | float? | Final corpus at maturity |
| `amount_received` | float? | Net amount received after TDS |
| `tds_deducted` | float? | Tax deducted at source on interest |
| `renewed` | bool? | FD/RD auto-renewed on maturity? |
| `renewal_investment_id` | string? | FK → investments.investment_id of the renewed record |

### Withdrawal Details  (government schemes)

```
withdrawal_details: object?   (null until first withdrawal)
```

| Field | Type | Description |
|-------|------|-------------|
| `date_of_withdrawal` | string? | ISO datetime |
| `withdrawal_type` | string? | `partial \| full \| premature \| annuity` |
| `amount_received` | float? | Net amount credited to bank |
| `annuity_amount` | float? | NPS mandatory annuity portion (typically 40%) |
| `lumpsum_amount` | float? | NPS lump-sum portion (typically 60%) |
| `tax_deducted` | float? | TDS on withdrawal |

---

## 2. investment_transactions Collection  (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `transaction_id` | string | PK — `txn_` + 12-char hex |
| `investment_id` | string | FK → investments |
| `user_id` | string | FK → users |
| `transaction_type` | Literal | `buy \| sell \| dividend \| interest \| mature \| redeem \| charges` |
| `amount` | float | Transaction amount |
| `total_amount` | float | Alias for calculations module |
| `quantity` | float? | Units / shares transacted |
| `price_per_unit` | float? | Price at transaction |
| `transaction_date` | datetime | Date of transaction |
| `brokerage_charges` | float | Charges (default 0) |
| `notes` | string? | Transaction notes |
| `created_at` | datetime | Record creation |

---

## 3. Supported Investment Types

### Market Investments
`stocks`, `mutual_funds`, `etf`, `bonds`, `reit`

### Fixed Income
`fd`, `corporate_deposit`, `rd`

### Government Schemes
`ppf`, `nps`, `epf`

### Physical Assets
`gold`, `silver`

### Insurance
`lic` — LIC / Endowment policies (with maturity value)
`insurance` — alias for `lic` (backward compat)
`term_insurance` — pure protection plans (no maturity payout)

### Others
`crypto`, `esop`, `private_equity`, `aif`, `arts_artifacts`,
`vehicle_car`, `vehicle_two_wheeler`, `vehicle_other`, `others`

---

## 4. Status Lifecycle

```
active
  ├──► partially_sold     (after partial sell of stocks/MF)
  ├──► partially_withdrawn (after partial NPS/EPF withdrawal)
  ├──► closed             (fully exited / sold)
  ├──► matured            (FD/RD/bonds reached maturity date)
  └──► withdrawn          (full NPS/EPF/PPF withdrawal)
```

---

## 5. Relationships

```
users (existing)
  └─(1:N)─► investments
                └─(1:N)─► investment_transactions
```

---

## 6. Pydantic Models (backend/investments.py)

| Model | Purpose |
|-------|---------|
| `SaleDetails` | Typed sale details — `extra='allow'` for backward compat |
| `MaturityDetails` | Typed maturity details — `extra='allow'` |
| `WithdrawalDetails` | Typed withdrawal details — `extra='allow'` |
| `InvestmentCreate` | POST payload — includes all 3 detail objects |
| `InvestmentUpdate` | PUT payload — uses typed models, adds `withdrawal_details` |
| `TransactionCreate` | POST transaction payload — `Literal` validated type |

---

## 7. Design Principles

1. **Single main table** — `investments` holds common fields + category metadata in `type_specific_data`
2. **Additive schema** — new detail objects (`withdrawal_details`) are nullable; existing records unaffected
3. **Typed + flexible** — Pydantic typed models with `extra='allow'` provide validation while preserving arbitrary extra keys
4. **No duplication** — reuses `users`, `investment_transactions` unchanged; no new collections needed
5. **Soft deletes** — `is_active: false` flag; data never hard-deleted
6. **Backward compatible** — `sale_details.date_of_withdrawal` (NPS legacy) still accepted alongside new `withdrawal_details`
