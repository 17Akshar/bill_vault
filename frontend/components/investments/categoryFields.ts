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
      { key: 'type_specific_data.folio_number', label: 'Folio/DP ID', type: 'text', placeholder: 'IN300214123456789' },
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
      { key: 'type_specific_data.folio_number', label: 'Folio/DP ID', type: 'text', placeholder: 'IN300468123456789' },
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
