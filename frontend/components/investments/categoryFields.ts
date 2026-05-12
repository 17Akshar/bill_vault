// Per-category field schemas for InvestmentDetailForm.
// Each entry describes how to render and edit a single field for a given
// investment category. The form composer reads this config and produces
// matching UI rows automatically.

export type FieldType = 'text' | 'number' | 'currency' | 'date' | 'percentage' | 'account_picker';

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
  subtitleKeys?: string[]; // optional multiple paths joined with " • "
  fields: FieldDef[];
  bottomSection: 'sale' | 'maturity' | 'withdrawal' | 'none';
  // Optional per-category overrides for the sub-sections.
  // When omitted, the default field-sets in the respective Section components are used.
  saleFields?: FieldDef[];
  maturityFields?: FieldDef[];
  withdrawalFields?: FieldDef[];
  // Set true for investment types where Gain/Loss is not meaningful (e.g. insurance).
  hideGainLoss?: boolean;
  // Optional informational banner shown at the bottom of the form (e.g. tax note for shares).
  footerNote?: string;
}

export const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
  stocks: {
    name: 'Shares',
    iconName: 'trending-up',
    iconColor: '#00E676',
    iconBg: '#00E67620',
    subtitleKeys: ['type_specific_data.sector', 'type_specific_data.exchange'],
    footerNote: 'Long term capital gains on equity shares are taxed as per applicable tax slab.',
    fields: [
      { key: 'type_specific_data.folio_number', label: 'Folio Number', type: 'text', placeholder: '123456789012' },
      { key: 'type_specific_data.dp_client_id', label: 'DP ID / Client ID', type: 'text', placeholder: 'IN300214 / 98765432' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'purchase_date', label: 'Invested Date', type: 'date' },
      { key: 'type_specific_data.shares', label: 'Number of Shares', type: 'number' },
      { key: 'type_specific_data.buy_price', label: 'Buy Price per Share', type: 'currency' },
      { key: 'type_specific_data.current_price', label: 'Current Price per Share', type: 'currency' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
      { key: 'sale_details.units_sold', label: 'Shares Sold', type: 'number' },
      { key: 'sale_details.sale_price', label: 'Price at which Sold', type: 'currency' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

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
      { key: 'type_specific_data.interest_rate', label: 'Interest Rate', type: 'percentage', hint: 'per annum' },
      { key: 'type_specific_data.tenure_months', label: 'Tenure', type: 'number', placeholder: 'months' },
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
      { key: 'type_specific_data.monthly_installment', label: 'Monthly Deposit', type: 'currency' },
      { key: 'type_specific_data.interest_rate', label: 'Interest Rate', type: 'percentage', hint: 'per annum' },
      { key: 'type_specific_data.tenure_months', label: 'Tenure', type: 'number', placeholder: 'months' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'type_specific_data.maturity_amount', label: 'Maturity Amount', type: 'currency' },
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
      { key: 'name', label: 'Bond Name', type: 'text', placeholder: 'e.g., GoI Sovereign Bond 2034' },
      { key: 'type_specific_data.bond_type', label: 'Bond Type', type: 'text', placeholder: 'Government / Corporate / Tax-Free' },
      { key: 'type_specific_data.face_value', label: 'Face Value', type: 'currency' },
      { key: 'type_specific_data.quantity', label: 'Quantity', type: 'number' },
      { key: 'type_specific_data.purchase_price', label: 'Purchase Price', type: 'currency' },
      { key: 'type_specific_data.coupon_rate', label: 'Coupon Rate', type: 'percentage', hint: 'per annum' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
      { key: 'sale_details.sale_price', label: 'Sale Price', type: 'currency' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

  ppf: {
    name: 'PPF',
    iconName: 'home',
    iconColor: '#4A90D9',
    iconBg: '#4A90D920',
    fields: [
      { key: 'type_specific_data.ppf_account_number', label: 'Account Number', type: 'text', placeholder: 'PPF1234567890' },
      { key: 'invested_amount', label: 'Invested Amount (Yearly)', type: 'currency' },
      { key: 'type_specific_data.interest_rate', label: 'Interest Rate (p.a.)', type: 'percentage' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'linked_account', label: 'Linked Account', type: 'account_picker', placeholder: 'Select bank account' },
    ],
    bottomSection: 'maturity',
    maturityFields: [
      { key: 'maturity_details.date_of_maturity', label: 'Date of Maturity', type: 'date' },
      { key: 'maturity_details.maturity_amount', label: 'Maturity Amount', type: 'currency' },
    ],
  },

  nps: {
    name: 'NPS',
    iconName: 'mail-open',
    iconColor: '#10B981',
    iconBg: '#10B98120',
    subtitleKey: 'type_specific_data.tier',
    fields: [
      { key: 'type_specific_data.pran', label: 'PRAN Number', type: 'text', placeholder: '110012345678' },
      { key: 'type_specific_data.tier', label: 'Tier', type: 'text', placeholder: 'Tier 1 / Tier 2' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'type_specific_data.asset_allocation', label: 'Allocation', type: 'text', placeholder: 'Aggressive / Moderate / Conservative' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
      { key: 'linked_account', label: 'Linked Account', type: 'account_picker', placeholder: 'Select bank account' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_withdrawal', label: 'Date of Withdrawal', type: 'date' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

  epf: {
    name: 'EPF',
    iconName: 'briefcase',
    iconColor: '#4285F4',
    iconBg: '#4285F420',
    hideGainLoss: true,
    fields: [
      { key: 'type_specific_data.uan', label: 'UAN Number', type: 'text', placeholder: '101234567890' },
      { key: 'type_specific_data.employee_share', label: 'Employee Share', type: 'currency' },
      { key: 'type_specific_data.employer_share', label: 'Employer Share', type: 'currency' },
      { key: 'invested_amount', label: 'Total Balance', type: 'currency' },
      { key: 'purchase_date', label: 'Last Updated', type: 'date' },
    ],
    bottomSection: 'withdrawal',
  },

  gold: {
    name: 'Gold',
    iconName: 'medal',
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
    subtitleKey: 'type_specific_data.purity',
    fields: [
      { key: 'type_specific_data.quantity', label: 'Quantity', type: 'text', placeholder: 'e.g., 50 grams' },
      { key: 'type_specific_data.purchase_price_per_unit', label: 'Purchase Price (per gm)', type: 'currency' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date' },
      { key: 'type_specific_data.current_price_per_unit', label: 'Current Price (per gm)', type: 'currency' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
      { key: 'sale_details.units_sold', label: 'Quantity Sold', type: 'text' },
      { key: 'sale_details.sale_price', label: 'Sale Price', type: 'currency' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

  silver: {
    name: 'Silver',
    iconName: 'diamond',
    iconColor: '#9E9E9E',
    iconBg: '#9E9E9E20',
    subtitleKey: 'type_specific_data.purity',
    fields: [
      { key: 'type_specific_data.quantity', label: 'Quantity', type: 'text', placeholder: 'e.g., 2 kg' },
      { key: 'type_specific_data.purchase_price_per_unit', label: 'Purchase Price (per kg)', type: 'currency' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date' },
      { key: 'type_specific_data.current_price_per_unit', label: 'Current Price (per kg)', type: 'currency' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
      { key: 'sale_details.units_sold', label: 'Quantity Sold', type: 'text' },
      { key: 'sale_details.sale_price', label: 'Sale Price', type: 'currency' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

  // LIC and general insurance policies (with maturity value)
  lic: {
    name: 'LIC',
    iconName: 'shield-checkmark',
    iconColor: '#2196F3',
    iconBg: '#2196F320',
    hideGainLoss: true,
    fields: [
      { key: 'type_specific_data.policy_number', label: 'Policy Number', type: 'text', placeholder: '9876543210' },
      { key: 'invested_amount', label: 'Premium Amount (Yearly)', type: 'currency' },
      { key: 'type_specific_data.sum_assured', label: 'Sum Assured', type: 'currency' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'type_specific_data.policy_status', label: 'Policy Status', type: 'text', placeholder: 'Active / Lapsed / Matured' },
    ],
    bottomSection: 'maturity',
    maturityFields: [
      { key: 'maturity_details.date_of_maturity', label: 'Date of Maturity', type: 'date' },
      { key: 'maturity_details.maturity_amount', label: 'Maturity Amount', type: 'currency' },
    ],
  },

  // Alias so existing investments saved as 'insurance' also get the LIC-style form
  insurance: {
    name: 'LIC',
    iconName: 'shield-checkmark',
    iconColor: '#2196F3',
    iconBg: '#2196F320',
    hideGainLoss: true,
    fields: [
      { key: 'type_specific_data.policy_number', label: 'Policy Number', type: 'text', placeholder: '9876543210' },
      { key: 'invested_amount', label: 'Premium Amount (Yearly)', type: 'currency' },
      { key: 'type_specific_data.sum_assured', label: 'Sum Assured', type: 'currency' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'type_specific_data.policy_status', label: 'Policy Status', type: 'text', placeholder: 'Active / Lapsed / Matured' },
    ],
    bottomSection: 'maturity',
    maturityFields: [
      { key: 'maturity_details.date_of_maturity', label: 'Date of Maturity', type: 'date' },
      { key: 'maturity_details.maturity_amount', label: 'Maturity Amount', type: 'currency' },
    ],
  },

  // Pure term insurance — no surrender or maturity value
  term_insurance: {
    name: 'Term Insurance',
    iconName: 'person-circle',
    iconColor: '#7C4DFF',
    iconBg: '#7C4DFF20',
    hideGainLoss: true,
    fields: [
      { key: 'type_specific_data.policy_number', label: 'Policy Number', type: 'text', placeholder: '100200300400' },
      { key: 'type_specific_data.sum_assured', label: 'Sum Assured', type: 'currency' },
      { key: 'invested_amount', label: 'Premium Amount (Yearly)', type: 'currency' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Maturity Date', type: 'date' },
      { key: 'type_specific_data.nominee', label: 'Nominee', type: 'text', placeholder: 'Spouse / Child / Parent' },
      { key: 'type_specific_data.policy_status', label: 'Policy Status', type: 'text', placeholder: 'Active / Lapsed' },
    ],
    bottomSection: 'none',
  },

  // Health insurance / Mediclaim — no surrender / maturity value
  health_insurance: {
    name: 'Mediclaim',
    iconName: 'people',
    iconColor: '#448AFF',
    iconBg: '#448AFF20',
    subtitleKey: 'type_specific_data.plan_type',
    hideGainLoss: true,
    fields: [
      { key: 'type_specific_data.insurance_company', label: 'Insurance Company Name', type: 'text', placeholder: 'Star Health' },
      { key: 'type_specific_data.policy_number', label: 'Policy Number', type: 'text', placeholder: '7654321098' },
      { key: 'type_specific_data.sum_assured', label: 'Sum Insured', type: 'currency' },
      { key: 'invested_amount', label: 'Premium Amount (Yearly)', type: 'currency' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Expiry Date', type: 'date' },
      { key: 'type_specific_data.members_covered', label: 'Members Covered', type: 'number', placeholder: '4' },
      { key: 'type_specific_data.policy_status', label: 'Policy Status', type: 'text', placeholder: 'Active / Lapsed' },
    ],
    bottomSection: 'none',
  },

  // Motor insurance (car / two-wheeler) — no surrender / maturity value
  motor_insurance: {
    name: 'Motor Insurance',
    iconName: 'car-sport',
    iconColor: '#448AFF',
    iconBg: '#448AFF20',
    subtitleKey: 'type_specific_data.vehicle_type',
    hideGainLoss: true,
    fields: [
      { key: 'type_specific_data.insurance_company', label: 'Insurance Company Name', type: 'text', placeholder: 'Bajaj Allianz' },
      { key: 'type_specific_data.policy_number', label: 'Policy Number', type: 'text', placeholder: 'MOT123456789' },
      { key: 'type_specific_data.vehicle_number', label: 'Vehicle Number', type: 'text', placeholder: 'MH02 AB 1234' },
      { key: 'type_specific_data.idv', label: 'IDV', type: 'currency', hint: 'Insured Declared Value' },
      { key: 'invested_amount', label: 'Premium Amount (Yearly)', type: 'currency' },
      { key: 'purchase_date', label: 'Start Date', type: 'date' },
      { key: 'maturity_date', label: 'Expiry Date', type: 'date' },
      { key: 'type_specific_data.policy_status', label: 'Policy Status', type: 'text', placeholder: 'Active / Lapsed' },
    ],
    bottomSection: 'none',
  },

  // Vehicle / Asset — Car / Two-Wheeler (Activa) / Any other vehicle
  vehicle: {
    name: 'Vehicle',
    iconName: 'car',
    iconColor: '#7C4DFF',
    iconBg: '#7C4DFF20',
    subtitleKey: 'type_specific_data.vehicle_type',
    hideGainLoss: true,
    fields: [
      { key: 'name', label: 'Vehicle Name', type: 'text', placeholder: 'Honda City' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date' },
      { key: 'invested_amount', label: 'Purchase Price', type: 'currency' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
      { key: 'type_specific_data.insurance_valid_till', label: 'Insurance Valid Till', type: 'date' },
    ],
    bottomSection: 'none',
  },

  // ESOP — Employee Stock Options
  esop: {
    name: 'ESOP',
    iconName: 'pricetag',
    iconColor: '#FF5252',
    iconBg: '#FF525220',
    hideGainLoss: true,
    fields: [
      { key: 'type_specific_data.company_name', label: 'Company Name', type: 'text', placeholder: 'XYZ Pvt Ltd' },
      { key: 'type_specific_data.shares_granted', label: 'Number of Shares', type: 'number', placeholder: '500' },
      { key: 'purchase_date', label: 'Grant Date', type: 'date' },
      { key: 'type_specific_data.vesting_period', label: 'Vesting Period', type: 'text', placeholder: '4 Years' },
      { key: 'type_specific_data.exercise_price', label: 'Exercise Price', type: 'currency' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
      { key: 'type_specific_data.vesting_status', label: 'Share Status', type: 'text', placeholder: 'Vested / Unvested / Partially Vested' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
      { key: 'sale_details.units_sold', label: 'Shares Sold', type: 'number' },
      { key: 'sale_details.sale_price', label: 'Sale Price', type: 'currency' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

  // Private Equity
  private_equity: {
    name: 'Private Equity',
    iconName: 'business',
    iconColor: '#9C27B0',
    iconBg: '#9C27B020',
    fields: [
      { key: 'name', label: 'Fund Name', type: 'text', placeholder: 'XYZ Private Equity Fund' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'purchase_date', label: 'Invested Date', type: 'date' },
      { key: 'type_specific_data.fund_type', label: 'Investment Type', type: 'text', placeholder: 'Private Equity' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

  // Arts & Artifacts
  arts_artifacts: {
    name: 'Arts & Artifacts',
    iconName: 'color-palette',
    iconColor: '#F59E0B',
    iconBg: '#F59E0B20',
    hideGainLoss: true,
    fields: [
      { key: 'name', label: 'Item Name', type: 'text', placeholder: 'Modern art painting' },
      { key: 'purchase_date', label: 'Purchase Date', type: 'date' },
      { key: 'invested_amount', label: 'Purchase Price', type: 'currency' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
      { key: 'type_specific_data.description', label: 'Description', type: 'text', placeholder: 'Modern art painting by Indian artist' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
      { key: 'sale_details.sale_price', label: 'Sale Price', type: 'currency' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

  // Alternate Investment Fund (AIF)
  aif: {
    name: 'Alternate Investment Fund',
    iconName: 'layers',
    iconColor: '#7C4DFF',
    iconBg: '#7C4DFF20',
    fields: [
      { key: 'name', label: 'Fund Name', type: 'text', placeholder: 'ABC AIF Fund' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'purchase_date', label: 'Invested Date', type: 'date' },
      { key: 'type_specific_data.fund_type', label: 'Fund Type', type: 'text', placeholder: 'Alternate Investment Fund' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

  // Crypto / Cryptocurrency
  crypto: {
    name: 'Cryptocurrency',
    iconName: 'logo-bitcoin',
    iconColor: '#F7931A',
    iconBg: '#F7931A20',
    fields: [
      { key: 'name', label: 'Cryptocurrency Name', type: 'text', placeholder: 'Bitcoin' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'purchase_date', label: 'Invested Date', type: 'date' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Sale', type: 'date' },
      { key: 'sale_details.sale_price', label: 'Sale Price', type: 'currency' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

  // P2P Lending (Others Investments)
  p2p_lending: {
    name: 'Others Investments',
    iconName: 'people-circle',
    iconColor: '#26C6A8',
    iconBg: '#26C6A820',
    fields: [
      { key: 'type_specific_data.platform_name', label: 'Investment Platform Name', type: 'text', placeholder: 'Faircent / LenDenClub / Liquiloans' },
      { key: 'invested_amount', label: 'Invested Amount', type: 'currency' },
      { key: 'purchase_date', label: 'Invested Date', type: 'date' },
      { key: 'current_value', label: 'Current Value', type: 'currency' },
    ],
    bottomSection: 'sale',
    saleFields: [
      { key: 'sale_details.date_of_sale', label: 'Date of Closure', type: 'date' },
      { key: 'sale_details.amount_received', label: 'Amount Received', type: 'currency' },
    ],
  },

// ── End of CATEGORY_CONFIG ──
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
