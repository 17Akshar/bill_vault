// Per-category field schemas for InvestmentDetailForm.
// Each entry describes how to render and edit a single field for a given
// investment category. The form composer reads this config and produces
// matching UI rows automatically.

export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'percentage';

export interface FieldDef {
  key: string;          // path inside investment (dot-notation; e.g. "type_specific_data.folio_number")
  label: string;
  type: FieldType;
  placeholder?: string;
  readOnly?: boolean;   // shown but not editable (e.g. computed Current Value)
  hint?: string;
}

export interface CategoryConfig {
  name: string;          // shown in header
  iconName: string;      // ionicons name
  iconColor: string;     // brand color
  iconBg: string;        // background tint behind icon
  subtitleKey?: string;  // dot path inside investment for the card subtitle
  fields: FieldDef[];
  bottomSection: 'sale' | 'maturity' | 'none';
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  mutual_funds: {
    name: 'Mutual Funds',
    iconName: 'pie-chart',
    iconColor: '#FF5252',
    iconBg: '#FF525220',
    subtitleKey: 'type_specific_data.scheme_type',
    fields: [
      { key: 'name', label: 'Fund Name', type: 'text', placeholder: 'e.g., SBI Bluechip Fund' },
      { key: 'type_specific_data.folio_number', label: 'Folio Number', type: 'text', placeholder: '12345678901234' },
      { key: 'type_specific_data.fund_house', label: 'AMC', type: 'text', placeholder: 'SBI Mutual Fund' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'purchase_date', label: 'Invested Date', type: 'date' },
      { key: 'type_specific_data.units', label: 'Units', type: 'number' },
      { key: 'type_specific_data.nav', label: 'NAV (as on date)', type: 'currency', hint: 'Net Asset Value per unit' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
  },

  etf: {
    name: 'Exchange Traded Funds',
    iconName: 'stats-chart',
    iconColor: '#14B8A6',
    iconBg: '#14B8A620',
    subtitleKey: 'type_specific_data.tracking_index',
    fields: [
      { key: 'name', label: 'ETF Name', type: 'text', placeholder: 'e.g., Nippon India ETF Nifty 50' },
      { key: 'type_specific_data.folio_number', label: 'Folio ID', type: 'text', placeholder: 'IN300214123456789' },
      { key: 'type_specific_data.exchange', label: 'Exchange', type: 'text', placeholder: 'NSE / BSE' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'purchase_date', label: 'Invested Date', type: 'date' },
      { key: 'type_specific_data.units', label: 'Units', type: 'number' },
      { key: 'type_specific_data.nav', label: 'NAV (as on date)', type: 'currency' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
  },

  reit: {
    name: 'REIT',
    iconName: 'business',
    iconColor: '#7C4DFF',
    iconBg: '#7C4DFF20',
    subtitleKey: 'type_specific_data.reit_type',
    fields: [
      { key: 'name', label: 'REIT Name', type: 'text', placeholder: 'e.g., Embassy Office Parks REIT' },
      { key: 'type_specific_data.folio_number', label: 'Folio ID', type: 'text', placeholder: 'IN300468123456789' },
      { key: 'type_specific_data.exchange', label: 'Exchange', type: 'text', placeholder: 'NSE / BSE' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'purchase_date', label: 'Invested Date', type: 'date' },
      { key: 'type_specific_data.units', label: 'Units', type: 'number' },
      { key: 'type_specific_data.nav', label: 'NAV (as on date)', type: 'currency' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
  },

  fd: {
    name: 'Fixed Deposit',
    iconName: 'lock-closed',
    iconColor: '#7C4DFF',
    iconBg: '#7C4DFF20',
    fields: [
      { key: 'type_specific_data.bank', label: 'Bank Name', type: 'text', placeholder: 'HDFC Bank' },
      { key: 'type_specific_data.fd_number', label: 'FD Number', type: 'text', placeholder: 'FD123456789' },
      { key: 'invested_amount', label: 'Deposit Amount', type: 'currency' },
      { key: 'type_specific_data.interest_rate', label: 'Interest Rate (p.a.)', type: 'percentage' },
      { key: 'type_specific_data.tenure_months', label: 'Tenure (months)', type: 'number' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'type_specific_data.maturity_amount', label: 'Maturity Amount', type: 'currency' },
    ],
    bottomSection: 'maturity',
  },

  corporate_deposit: {
    name: 'Corporate Deposit',
    iconName: 'briefcase',
    iconColor: '#7C4DFF',
    iconBg: '#7C4DFF20',
    subtitleKey: 'type_specific_data.scheme_type',
    fields: [
      { key: 'type_specific_data.issuer_name', label: 'Issuer Name', type: 'text', placeholder: 'Mahindra Finance' },
      { key: 'invested_amount', label: 'Deposit Amount', type: 'currency' },
      { key: 'type_specific_data.interest_rate', label: 'Interest Rate (p.a.)', type: 'percentage' },
      { key: 'type_specific_data.tenure_months', label: 'Tenure (months)', type: 'number' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'type_specific_data.maturity_amount', label: 'Maturity Amount', type: 'currency' },
    ],
    bottomSection: 'maturity',
  },

  rd: {
    name: 'Recurring Deposit',
    iconName: 'calendar',
    iconColor: '#9C27B0',
    iconBg: '#9C27B020',
    fields: [
      { key: 'type_specific_data.bank', label: 'Bank Name', type: 'text', placeholder: 'HDFC Bank' },
      { key: 'type_specific_data.rd_number', label: 'RD Number', type: 'text', placeholder: 'RD123456789' },
      { key: 'type_specific_data.monthly_installment', label: 'Monthly Installment', type: 'currency' },
      { key: 'type_specific_data.interest_rate', label: 'Interest Rate (p.a.)', type: 'percentage' },
      { key: 'type_specific_data.tenure_months', label: 'Tenure (months)', type: 'number' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'invested_amount', label: 'Total Invested', type: 'currency' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'maturity',
  },

  bonds: {
    name: 'Bonds',
    iconName: 'document-text',
    iconColor: '#14B8A6',
    iconBg: '#14B8A620',
    subtitleKey: 'type_specific_data.bond_type',
    fields: [
      { key: 'type_specific_data.issuer_name', label: 'Issuer', type: 'text', placeholder: 'Government of India / Tata Capital' },
      { key: 'type_specific_data.bond_type', label: 'Type', type: 'text', placeholder: 'Government / Corporate / Tax-Free' },
      { key: 'type_specific_data.isin', label: 'ISIN', type: 'text', placeholder: 'IN0020230041' },
      { key: 'type_specific_data.face_value', label: 'Face Value (per unit)', type: 'currency' },
      { key: 'type_specific_data.units', label: 'Units', type: 'number' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'type_specific_data.coupon_rate', label: 'Coupon Rate (p.a.)', type: 'percentage' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'maturity',
  },

  ppf: {
    name: 'PPF',
    iconName: 'shield-checkmark',
    iconColor: '#00BCD4',
    iconBg: '#00BCD420',
    fields: [
      { key: 'type_specific_data.bank', label: 'Bank / Post Office', type: 'text', placeholder: 'State Bank of India' },
      { key: 'type_specific_data.ppf_account_number', label: 'PPF Account Number', type: 'text', placeholder: 'PPF1234567890' },
      { key: 'invested_amount', label: 'Total Invested', type: 'currency' },
      { key: 'type_specific_data.annual_contribution', label: 'Annual Contribution', type: 'currency' },
      { key: 'type_specific_data.interest_rate', label: 'Interest Rate (p.a.)', type: 'percentage' },
      { key: 'purchase_date', label: 'Account Opened', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'current_value', label: 'Current Balance', type: 'currency' },
    ],
    bottomSection: 'maturity',
  },

  nps: {
    name: 'NPS',
    iconName: 'ribbon',
    iconColor: '#4CAF50',
    iconBg: '#4CAF5020',
    subtitleKey: 'type_specific_data.tier',
    fields: [
      { key: 'type_specific_data.pran', label: 'PRAN Number', type: 'text', placeholder: '110012345678' },
      { key: 'type_specific_data.tier', label: 'Tier', type: 'text', placeholder: 'Tier 1 / Tier 2' },
      { key: 'type_specific_data.fund_manager', label: 'Pension Fund Manager', type: 'text', placeholder: 'HDFC Pension Fund' },
      { key: 'type_specific_data.asset_allocation', label: 'Asset Allocation', type: 'text', placeholder: '75% Equity, 25% Debt' },
      { key: 'invested_amount', label: 'Total Invested', type: 'currency' },
      { key: 'purchase_date', label: 'Account Opened', type: 'date' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'none',
  },
};

// Fallback config for any investment_type without a dedicated schema yet.
// Renders the universal core fields so the screen still works.
export const FALLBACK_CONFIG: CategoryConfig = {
  name: 'Investment',
  iconName: 'cash',
  iconColor: '#6366F1',
  iconBg: '#6366F120',
  fields: [
    { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
    { key: 'purchase_date', label: 'Invested Date', type: 'date' },
    { key: 'current_value', label: 'Current Value', type: 'currency' },
  ],
  bottomSection: 'none',
};

export const getCategoryConfig = (investmentType: string): CategoryConfig =>
  CATEGORY_CONFIG[investmentType] || FALLBACK_CONFIG;

// Helper: read a value from an object at a dot-path
export const getByPath = (obj: any, path: string): any => {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
};

// Helper: produce a new object with a value set at a dot-path (immutable)
export const setByPath = (obj: any, path: string, value: any): any => {
  const parts = path.split('.');
  const next = { ...(obj || {}) };
  let cursor: any = next;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    cursor[k] = { ...(cursor[k] || {}) };
    cursor = cursor[k];
  }
  cursor[parts[parts.length - 1]] = value;
  return next;
};
