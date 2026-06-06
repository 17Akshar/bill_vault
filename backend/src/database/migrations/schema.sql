-- ============================================================
-- FINCARE DATABASE SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS & AUTHENTICATION
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  avatar_url    VARCHAR(500),
  currency      VARCHAR(10) NOT NULL DEFAULT 'INR',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES (family members)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         VARCHAR(100) NOT NULL,
  relationship VARCHAR(50),
  icon         VARCHAR(10),
  color        VARCHAR(20),
  is_primary   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ACCOUNTS
-- ============================================================
CREATE TABLE IF NOT EXISTS accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  account_type    VARCHAR(30) NOT NULL CHECK (account_type IN ('bank','savings','current','cash','wallet','credit','investment','other')),
  bank_name       VARCHAR(100),
  account_number  VARCHAR(20),
  balance         NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        VARCHAR(10) NOT NULL DEFAULT 'INR',
  color           VARCHAR(20),
  icon            VARCHAR(10),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  include_in_net_worth BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTION CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('income','expense','transfer')),
  icon        VARCHAR(10),
  color       VARCHAR(20),
  is_default  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRANSACTIONS (income, expense, transfer)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('income','expense','transfer')),
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  description     VARCHAR(255) NOT NULL,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id      UUID REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  date            DATE NOT NULL,
  notes           TEXT,
  tags            TEXT[],
  is_recurring    BOOLEAN NOT NULL DEFAULT false,
  recurrence_rule VARCHAR(50),
  receipt_url     VARCHAR(500),
  is_tax_related  BOOLEAN NOT NULL DEFAULT false,
  reference_no    VARCHAR(100),
  payee           VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);

-- ============================================================
-- INVESTMENTS - BASE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS investments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category        VARCHAR(50) NOT NULL CHECK (category IN (
    'mutual_fund','etf','stock','fd','cd','rd','bond','gold',
    'nps','ppf','epf','crypto','esop','private_equity','aif',
    'artwork','real_estate','other'
  )),
  name            VARCHAR(255) NOT NULL,
  invested_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_value   NUMERIC(15,2) NOT NULL DEFAULT 0,
  quantity        NUMERIC(20,6),
  purchase_price  NUMERIC(15,4),
  current_price   NUMERIC(15,4),
  purchase_date   DATE,
  maturity_date   DATE,
  currency        VARCHAR(10) NOT NULL DEFAULT 'INR',
  status          VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active','matured','sold','withdrawn','closed')),
  notes           TEXT,
  color           VARCHAR(20),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_investments_user_id ON investments(user_id);
CREATE INDEX idx_investments_category ON investments(category);

-- ============================================================
-- MUTUAL FUNDS (extends investments)
-- ============================================================
CREATE TABLE IF NOT EXISTS mutual_funds (
  investment_id   UUID PRIMARY KEY REFERENCES investments(id) ON DELETE CASCADE,
  fund_type       VARCHAR(50),
  isin            VARCHAR(20),
  amc             VARCHAR(100),
  nav             NUMERIC(15,4),
  units           NUMERIC(20,6),
  expense_ratio   NUMERIC(5,4),
  fund_manager    VARCHAR(100),
  benchmark       VARCHAR(100),
  aum             NUMERIC(20,2),
  risk_level      VARCHAR(20),
  return_1m       NUMERIC(8,4),
  return_3m       NUMERIC(8,4),
  return_6m       NUMERIC(8,4),
  return_1y       NUMERIC(8,4),
  return_3y       NUMERIC(8,4),
  return_5y       NUMERIC(8,4),
  sip_amount      NUMERIC(15,2),
  sip_date        INTEGER,
  folio_number    VARCHAR(50)
);

-- ============================================================
-- FIXED DEPOSITS
-- ============================================================
CREATE TABLE IF NOT EXISTS fixed_deposits (
  investment_id    UUID PRIMARY KEY REFERENCES investments(id) ON DELETE CASCADE,
  bank_name        VARCHAR(100) NOT NULL,
  fd_number        VARCHAR(50),
  principal        NUMERIC(15,2) NOT NULL,
  interest_rate    NUMERIC(6,4) NOT NULL,
  tenure_months    INTEGER NOT NULL,
  interest_type    VARCHAR(20) DEFAULT 'cumulative' CHECK (interest_type IN ('cumulative','non_cumulative')),
  compounding_freq VARCHAR(20) DEFAULT 'quarterly',
  maturity_amount  NUMERIC(15,2),
  auto_renewal     BOOLEAN DEFAULT false,
  tds_applicable   BOOLEAN DEFAULT true,
  nomination       VARCHAR(100)
);

-- ============================================================
-- RECURRING DEPOSITS
-- ============================================================
CREATE TABLE IF NOT EXISTS recurring_deposits (
  investment_id        UUID PRIMARY KEY REFERENCES investments(id) ON DELETE CASCADE,
  bank_name            VARCHAR(100) NOT NULL,
  monthly_installment  NUMERIC(15,2) NOT NULL,
  tenure_months        INTEGER NOT NULL,
  interest_rate        NUMERIC(6,4) NOT NULL,
  maturity_amount      NUMERIC(15,2),
  auto_debit           BOOLEAN DEFAULT false,
  debit_account_id     UUID REFERENCES accounts(id) ON DELETE SET NULL,
  installments_paid    INTEGER DEFAULT 0
);

-- ============================================================
-- INSURANCE POLICIES
-- ============================================================
CREATE TABLE IF NOT EXISTS insurance_policies (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(30) NOT NULL CHECK (type IN ('term','mediclaim','lic','motor','vehicle','health','other')),
  policy_number     VARCHAR(100),
  provider          VARCHAR(100) NOT NULL,
  plan_name         VARCHAR(255) NOT NULL,
  sum_assured       NUMERIC(15,2),
  premium_amount    NUMERIC(15,2),
  premium_frequency VARCHAR(20) DEFAULT 'annual' CHECK (premium_frequency IN ('monthly','quarterly','half_yearly','annual')),
  start_date        DATE,
  end_date          DATE,
  maturity_date     DATE,
  status            VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired','lapsed','surrendered','matured')),
  premium_due_date  DATE,
  nominee_name      VARCHAR(100),
  nominee_relation  VARCHAR(50),
  agent_name        VARCHAR(100),
  notes             TEXT,
  documents         JSONB DEFAULT '[]',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_insurance_user_id ON insurance_policies(user_id);

CREATE TABLE IF NOT EXISTS insurance_premium_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id   UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  amount      NUMERIC(15,2) NOT NULL,
  paid_date   DATE NOT NULL,
  receipt_no  VARCHAR(100),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mediclaim members
CREATE TABLE IF NOT EXISTS mediclaim_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id   UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  relation    VARCHAR(50),
  dob         DATE,
  sum_insured NUMERIC(15,2),
  pre_existing_conditions TEXT
);

-- Insurance claims
CREATE TABLE IF NOT EXISTS insurance_claims (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  policy_id      UUID NOT NULL REFERENCES insurance_policies(id) ON DELETE CASCADE,
  claim_number   VARCHAR(100),
  claim_date     DATE NOT NULL,
  claim_amount   NUMERIC(15,2),
  approved_amount NUMERIC(15,2),
  status         VARCHAR(30) DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','approved','rejected','paid','closed')),
  reason         TEXT,
  documents      JSONB DEFAULT '[]',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- LOANS
-- ============================================================
CREATE TABLE IF NOT EXISTS loans (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  loan_type        VARCHAR(30) NOT NULL CHECK (loan_type IN ('home','personal','auto','education','business','gold','other')),
  lender_name      VARCHAR(100) NOT NULL,
  loan_account_no  VARCHAR(50),
  principal        NUMERIC(15,2) NOT NULL,
  outstanding      NUMERIC(15,2) NOT NULL,
  interest_rate    NUMERIC(6,4) NOT NULL,
  tenure_months    INTEGER NOT NULL,
  emi_amount       NUMERIC(15,2),
  emi_type         VARCHAR(20) DEFAULT 'fixed' CHECK (emi_type IN ('fixed','floating')),
  start_date       DATE,
  end_date         DATE,
  emi_due_date     INTEGER CHECK (emi_due_date BETWEEN 1 AND 31),
  account_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  status           VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','closed','overdue','foreclosed')),
  prepayment_penalty BOOLEAN DEFAULT false,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loans_user_id ON loans(user_id);

CREATE TABLE IF NOT EXISTS loan_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id     UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('emi','prepayment','foreclosure')),
  amount      NUMERIC(15,2) NOT NULL,
  principal   NUMERIC(15,2),
  interest    NUMERIC(15,2),
  paid_date   DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CREDIT CARDS
-- ============================================================
CREATE TABLE IF NOT EXISTS credit_cards (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_name       VARCHAR(100) NOT NULL,
  issuer          VARCHAR(100) NOT NULL,
  card_number     VARCHAR(20),
  credit_limit    NUMERIC(15,2) NOT NULL,
  outstanding     NUMERIC(15,2) NOT NULL DEFAULT 0,
  minimum_payment NUMERIC(15,2),
  bill_due_date   INTEGER CHECK (bill_due_date BETWEEN 1 AND 31),
  billing_date    INTEGER CHECK (billing_date BETWEEN 1 AND 31),
  reward_points   NUMERIC(15,2) DEFAULT 0,
  annual_fee      NUMERIC(15,2),
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','blocked','cancelled','expired')),
  color           VARCHAR(20),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_card_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id     UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount      NUMERIC(15,2) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('debit','credit','payment','cashback','reward')),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  merchant    VARCHAR(100),
  emi_months  INTEGER,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_card_payments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id     UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  amount      NUMERIC(15,2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_type VARCHAR(30) DEFAULT 'full' CHECK (payment_type IN ('full','minimum','custom')),
  account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- RENTAL PROPERTIES
-- ============================================================
CREATE TABLE IF NOT EXISTS rentals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  property_name   VARCHAR(255) NOT NULL,
  property_type   VARCHAR(30) CHECK (property_type IN ('apartment','house','commercial','plot','other')),
  address         TEXT,
  market_value    NUMERIC(15,2),
  monthly_rent    NUMERIC(15,2),
  security_deposit NUMERIC(15,2),
  tenant_name     VARCHAR(100),
  tenant_phone    VARCHAR(20),
  tenant_email    VARCHAR(100),
  lease_start     DATE,
  lease_end       DATE,
  rent_due_date   INTEGER CHECK (rent_due_date BETWEEN 1 AND 31),
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','vacant','maintenance','sold')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rental_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id   UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('rent','deposit','expense','maintenance','other')),
  amount      NUMERIC(15,2) NOT NULL,
  date        DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REMINDERS & BILL PAYMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS reminders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title            VARCHAR(255) NOT NULL,
  provider         VARCHAR(100),
  category         VARCHAR(50) NOT NULL,
  amount           NUMERIC(15,2),
  due_date         DATE NOT NULL,
  status           VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','skipped','cancelled')),
  is_recurring     BOOLEAN DEFAULT false,
  recurrence_rule  VARCHAR(50),
  recurrence_end   DATE,
  notify_days_before INTEGER DEFAULT 3,
  notify_on_due    BOOLEAN DEFAULT true,
  account_id       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reminders_user_id ON reminders(user_id);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_status ON reminders(status);

CREATE TABLE IF NOT EXISTS reminder_payments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reminder_id   UUID NOT NULL REFERENCES reminders(id) ON DELETE CASCADE,
  amount        NUMERIC(15,2) NOT NULL,
  paid_date     DATE NOT NULL,
  payment_method VARCHAR(50),
  reference_no  VARCHAR(100),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- BUDGETS
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  budget_amount NUMERIC(15,2) NOT NULL,
  period        VARCHAR(20) DEFAULT 'monthly' CHECK (period IN ('weekly','monthly','quarterly','yearly')),
  start_date    DATE NOT NULL,
  end_date      DATE,
  alert_at_pct  INTEGER DEFAULT 80,
  rollover      BOOLEAN DEFAULT false,
  is_active     BOOLEAN DEFAULT true,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budgets_user_id ON budgets(user_id);

-- ============================================================
-- FINANCIAL GOALS
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name            VARCHAR(255) NOT NULL,
  target_amount   NUMERIC(15,2) NOT NULL,
  current_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_date     DATE,
  category        VARCHAR(50),
  icon            VARCHAR(10),
  color           VARCHAR(20),
  priority        VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high')),
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','achieved','paused','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- MONEY LENDING / BORROWING
-- ============================================================
CREATE TABLE IF NOT EXISTS lending (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('lent','borrowed')),
  person_name     VARCHAR(100) NOT NULL,
  person_phone    VARCHAR(20),
  amount          NUMERIC(15,2) NOT NULL,
  remaining       NUMERIC(15,2) NOT NULL,
  interest_rate   NUMERIC(6,4) DEFAULT 0,
  date            DATE NOT NULL,
  due_date        DATE,
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','settled','partial','overdue')),
  notes           TEXT,
  account_id      UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lending_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lending_id  UUID NOT NULL REFERENCES lending(id) ON DELETE CASCADE,
  amount      NUMERIC(15,2) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('payment','receipt','interest')),
  date        DATE NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         VARCHAR(255) NOT NULL,
  content       TEXT,
  note_type     VARCHAR(20) DEFAULT 'text' CHECK (note_type IN ('text','voice','scan','checklist')),
  tags          TEXT[],
  is_pinned     BOOLEAN DEFAULT false,
  is_locked     BOOLEAN DEFAULT false,
  reminder_at   TIMESTAMPTZ,
  color         VARCHAR(20),
  attachments   JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVESTMENT TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS investment_transactions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id  UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  type           VARCHAR(20) NOT NULL CHECK (type IN ('buy','sell','dividend','interest','bonus','split','sip')),
  amount         NUMERIC(15,2) NOT NULL,
  quantity       NUMERIC(20,6),
  price          NUMERIC(15,4),
  date           DATE NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INVESTMENT NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS investment_notes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  investment_id UUID NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  note_type     VARCHAR(20) DEFAULT 'general' CHECK (note_type IN ('general','research','news','alert','document')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- GOLD INVESTMENTS (extends investments)
-- ============================================================
CREATE TABLE IF NOT EXISTS gold_investments (
  investment_id  UUID PRIMARY KEY REFERENCES investments(id) ON DELETE CASCADE,
  gold_type      VARCHAR(30) CHECK (gold_type IN ('physical','sgb','etf','digital')),
  purity         VARCHAR(10),
  weight_grams   NUMERIC(10,4),
  storage_location VARCHAR(100),
  hallmark_no    VARCHAR(50)
);

-- ============================================================
-- CRYPTO (extends investments)
-- ============================================================
CREATE TABLE IF NOT EXISTS crypto_investments (
  investment_id  UUID PRIMARY KEY REFERENCES investments(id) ON DELETE CASCADE,
  symbol         VARCHAR(20) NOT NULL,
  blockchain     VARCHAR(50),
  wallet_address VARCHAR(255),
  exchange_name  VARCHAR(100),
  staked_amount  NUMERIC(20,8) DEFAULT 0,
  staking_rewards NUMERIC(20,8) DEFAULT 0
);

-- ============================================================
-- EPF / PPF / NPS (extends investments)
-- ============================================================
CREATE TABLE IF NOT EXISTS provident_funds (
  investment_id    UUID PRIMARY KEY REFERENCES investments(id) ON DELETE CASCADE,
  fund_type        VARCHAR(10) CHECK (fund_type IN ('epf','ppf','nps')),
  uan_number       VARCHAR(30),
  account_number   VARCHAR(50),
  employer_name    VARCHAR(100),
  employee_contribution NUMERIC(15,2) DEFAULT 0,
  employer_contribution NUMERIC(15,2) DEFAULT 0,
  interest_rate    NUMERIC(6,4),
  maturity_date    DATE
);

-- ============================================================
-- OTHER ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS other_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_type      VARCHAR(50) NOT NULL,
  name            VARCHAR(255) NOT NULL,
  description     TEXT,
  purchase_value  NUMERIC(15,2),
  current_value   NUMERIC(15,2),
  purchase_date   DATE,
  location        TEXT,
  status          VARCHAR(20) DEFAULT 'owned' CHECK (status IN ('owned','sold','donated','lost','insured')),
  documents       JSONB DEFAULT '[]',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  type        VARCHAR(50),
  reference_id UUID,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FILE UPLOADS
-- ============================================================
CREATE TABLE IF NOT EXISTS file_uploads (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename     VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type    VARCHAR(100) NOT NULL,
  file_size    INTEGER NOT NULL,
  url          VARCHAR(500) NOT NULL,
  entity_type  VARCHAR(50),
  entity_id    UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUTO UPDATE updated_at TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users','accounts','transactions','investments','insurance_policies',
    'insurance_claims','loans','credit_cards','rentals','reminders',
    'budgets','goals','lending','notes','other_assets'
  ] LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t, t
    );
  END LOOP;
END $$;
