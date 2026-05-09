// Investment Types Configuration
// Defines all 26 investment types with their specific fields and metadata

export interface InvestmentType {
  key: string;
  label: string;
  category: 'market' | 'fixed_income' | 'physical' | 'insurance' | 'vehicle' | 'other';
  icon: string;
  color: string;
  fields: InvestmentField[];
}

export interface InvestmentField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  prefix?: string;
  suffix?: string;
}

export const INVESTMENT_TYPES: InvestmentType[] = [
  // Market Investments
  {
    key: 'stocks',
    label: 'Shares / Stocks',
    category: 'market',
    icon: 'trending-up',
    color: '#00E676',
    fields: [
      { key: 'company_name', label: 'Company Name', type: 'text', required: true, placeholder: 'Reliance Industries' },
      { key: 'exchange', label: 'Exchange', type: 'select', options: ['NSE', 'BSE'], required: true },
      { key: 'quantity', label: 'Quantity (Shares)', type: 'number', required: true, placeholder: '50' },
      { key: 'buy_price', label: 'Buy Price (Per Share)', type: 'number', required: true, placeholder: '2987.45', prefix: '₹' },
      { key: 'current_price', label: 'Current Price (Per Share)', type: 'number', required: true, placeholder: '3150.00', prefix: '₹' },
    ]
  },
  {
    key: 'mutual_funds',
    label: 'Mutual Funds',
    category: 'market',
    icon: 'pie-chart',
    color: '#448AFF',
    fields: [
      { key: 'fund_name', label: 'Fund Name', type: 'text', required: true, placeholder: 'SBI Bluechip Fund' },
      { key: 'folio_number', label: 'Folio Number', type: 'text', placeholder: '123456789012' },
      { key: 'amc', label: 'AMC / Fund House', type: 'text', placeholder: 'SBI Mutual Fund' },
      { key: 'units', label: 'Units', type: 'number', required: true, placeholder: '1500.45' },
      { key: 'nav', label: 'NAV (As on date)', type: 'number', required: true, placeholder: '450.58', prefix: '₹' },
      { key: 'plan_type', label: 'Plan Type', type: 'select', options: ['Growth', 'Dividend', 'Direct', 'Regular'] },
    ]
  },
  {
    key: 'etf',
    label: 'Exchange Traded Funds',
    category: 'market',
    icon: 'stats-chart',
    color: '#7C4DFF',
    fields: [
      { key: 'etf_name', label: 'ETF Name', type: 'text', required: true, placeholder: 'Nippon India NIFTY 50 ETF' },
      { key: 'folio_id', label: 'Folio / DP ID', type: 'text', placeholder: '1234567890' },
      { key: 'exchange', label: 'Exchange', type: 'select', options: ['NSE', 'BSE'] },
      { key: 'units', label: 'Units', type: 'number', required: true, placeholder: '100' },
      { key: 'nav', label: 'NAV (As on date)', type: 'number', required: true, placeholder: '185.50', prefix: '₹' },
    ]
  },
  {
    key: 'bonds',
    label: 'Bonds',
    category: 'market',
    icon: 'document-text',
    color: '#14B8A6',
    fields: [
      { key: 'bond_type', label: 'Bond Type', type: 'select', options: ['Government Bond', 'Corporate Bond', 'Tax-Free Bond'], required: true },
      { key: 'bond_name', label: 'Bond Name', type: 'text', placeholder: 'Government Bond 2030' },
      { key: 'face_value', label: 'Face Value', type: 'number', required: true, placeholder: '1000', prefix: '₹' },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '100' },
      { key: 'coupon_rate', label: 'Coupon Rate (% p.a.)', type: 'number', placeholder: '7.50', suffix: '%' },
    ]
  },
  {
    key: 'reit',
    label: 'REIT',
    category: 'market',
    icon: 'business',
    color: '#FF6B81',
    fields: [
      { key: 'reit_name', label: 'REIT Name', type: 'text', required: true, placeholder: 'Nexus Select Trust' },
      { key: 'folio_id', label: 'Folio / DP ID', type: 'text', placeholder: '1234567890' },
      { key: 'exchange', label: 'Exchange', type: 'select', options: ['NSE', 'BSE'] },
      { key: 'units', label: 'Units', type: 'number', required: true, placeholder: '500' },
      { key: 'nav', label: 'NAV (As on date)', type: 'number', required: true, placeholder: '125.00', prefix: '₹' },
    ]
  },

  // Fixed Income
  {
    key: 'fd',
    label: 'Fixed Deposit',
    category: 'fixed_income',
    icon: 'lock-closed',
    color: '#FFB300',
    fields: [
      { key: 'bank_name', label: 'Bank Name', type: 'text', required: true, placeholder: 'HDFC Bank' },
      { key: 'fd_number', label: 'FD Number', type: 'text', placeholder: 'FD123456789' },
      { key: 'interest_rate', label: 'Interest Rate (% p.a.)', type: 'number', required: true, placeholder: '7.25', suffix: '%' },
      { key: 'tenure', label: 'Tenure (Months)', type: 'number', required: true, placeholder: '24' },
    ]
  },
  {
    key: 'corporate_deposit',
    label: 'Corporate Deposit',
    category: 'fixed_income',
    icon: 'briefcase',
    color: '#8D6E63',
    fields: [
      { key: 'company_name', label: 'Company Name', type: 'text', required: true, placeholder: 'Mahindra Finance' },
      { key: 'deposit_number', label: 'Deposit Number', type: 'text', placeholder: 'CD123456' },
      { key: 'interest_rate', label: 'Interest Rate (% p.a.)', type: 'number', required: true, placeholder: '8.50', suffix: '%' },
      { key: 'tenure', label: 'Tenure (Months)', type: 'number', required: true, placeholder: '36' },
    ]
  },
  {
    key: 'rd',
    label: 'Recurring Deposit',
    category: 'fixed_income',
    icon: 'calendar',
    color: '#9C27B0',
    fields: [
      { key: 'bank_name', label: 'Bank / Scheme Name', type: 'text', required: true, placeholder: 'SBI Recurring Deposit' },
      { key: 'rd_number', label: 'RD Account Number', type: 'text', placeholder: 'RD123456789' },
      { key: 'monthly_deposit', label: 'Monthly Deposit', type: 'number', required: true, placeholder: '5000', prefix: '₹' },
      { key: 'interest_rate', label: 'Interest Rate (% p.a.)', type: 'number', required: true, placeholder: '6.50', suffix: '%' },
      { key: 'tenure', label: 'Tenure (Months)', type: 'number', required: true, placeholder: '60' },
    ]
  },
  {
    key: 'ppf',
    label: 'PPF',
    category: 'fixed_income',
    icon: 'shield-checkmark',
    color: '#FF5722',
    fields: [
      { key: 'account_number', label: 'Account Number', type: 'text', required: true, placeholder: 'PPF123456789' },
      { key: 'yearly_investment', label: 'Yearly Investment', type: 'number', required: true, placeholder: '150000', prefix: '₹' },
      { key: 'interest_rate', label: 'Interest Rate (% p.a.)', type: 'number', placeholder: '7.10', suffix: '%' },
    ]
  },
  {
    key: 'nps',
    label: 'NPS',
    category: 'fixed_income',
    icon: 'ribbon',
    color: '#00BCD4',
    fields: [
      { key: 'pran_number', label: 'PRAN Number', type: 'text', required: true, placeholder: '123456789012' },
      { key: 'tier', label: 'Tier', type: 'select', options: ['Tier 1', 'Tier 2'], required: true },
      { key: 'allocation', label: 'Asset Allocation', type: 'text', placeholder: 'E:50%, C:30%, G:20%' },
    ]
  },
  {
    key: 'epf',
    label: 'EPF',
    category: 'fixed_income',
    icon: 'wallet',
    color: '#4CAF50',
    fields: [
      { key: 'uan_number', label: 'UAN Number', type: 'text', required: true, placeholder: '123456789012' },
      { key: 'employer_share', label: 'Employer Share', type: 'number', placeholder: '50000', prefix: '₹' },
      { key: 'employee_share', label: 'Employee Share', type: 'number', placeholder: '50000', prefix: '₹' },
    ]
  },

  // Physical Assets
  {
    key: 'gold',
    label: 'Gold',
    category: 'physical',
    icon: 'diamond',
    color: '#FF9100',
    fields: [
      { key: 'gold_type', label: 'Type', type: 'select', options: ['Physical Gold 24K', 'Physical Gold 22K', 'Digital Gold', 'Gold ETF', 'Gold Bond'], required: true },
      { key: 'quantity', label: 'Quantity (grams)', type: 'number', required: true, placeholder: '50' },
      { key: 'purchase_price_per_gm', label: 'Purchase Price (per gm)', type: 'number', required: true, placeholder: '5500', prefix: '₹' },
      { key: 'current_price_per_gm', label: 'Current Price (per gm)', type: 'number', required: true, placeholder: '6200', prefix: '₹' },
    ]
  },
  {
    key: 'silver',
    label: 'Silver',
    category: 'physical',
    icon: 'medal',
    color: '#9E9E9E',
    fields: [
      { key: 'silver_type', label: 'Type', type: 'select', options: ['Physical Silver 99.9%', 'Silver Coins', 'Silver ETF'], required: true },
      { key: 'quantity', label: 'Quantity (kg)', type: 'number', required: true, placeholder: '5' },
      { key: 'purchase_price_per_kg', label: 'Purchase Price (per kg)', type: 'number', required: true, placeholder: '70000', prefix: '₹' },
      { key: 'current_price_per_kg', label: 'Current Price (per kg)', type: 'number', required: true, placeholder: '75000', prefix: '₹' },
    ]
  },

  // Insurance
  {
    key: 'lic',
    label: 'LIC',
    category: 'insurance',
    icon: 'shield',
    color: '#3F51B5',
    fields: [
      { key: 'policy_name', label: 'Policy Name', type: 'text', required: true, placeholder: 'LIC Jeevan Anand' },
      { key: 'policy_number', label: 'Policy Number', type: 'text', required: true, placeholder: '123456789' },
      { key: 'premium_amount', label: 'Premium Amount', type: 'number', required: true, placeholder: '50000', prefix: '₹' },
      { key: 'sum_assured', label: 'Sum Assured', type: 'number', required: true, placeholder: '2500000', prefix: '₹' },
      { key: 'premium_frequency', label: 'Premium Frequency', type: 'select', options: ['Yearly', 'Half-Yearly', 'Quarterly', 'Monthly'] },
    ]
  },
  {
    key: 'term_insurance',
    label: 'Term Insurance',
    category: 'insurance',
    icon: 'umbrella',
    color: '#EF4444',
    fields: [
      { key: 'plan_name', label: 'Plan Name', type: 'text', required: true, placeholder: 'HDFC Life Term Plan' },
      { key: 'policy_number', label: 'Policy Number', type: 'text', required: true, placeholder: '987654321' },
      { key: 'sum_assured', label: 'Sum Assured', type: 'number', required: true, placeholder: '10000000', prefix: '₹' },
      { key: 'premium_yearly', label: 'Premium (Yearly)', type: 'number', required: true, placeholder: '15000', prefix: '₹' },
      { key: 'nominee', label: 'Nominee Name', type: 'text', placeholder: 'John Doe' },
    ]
  },
  {
    key: 'mediclaim',
    label: 'Mediclaim',
    category: 'insurance',
    icon: 'medkit',
    color: '#10B981',
    fields: [
      { key: 'scheme_name', label: 'Scheme Name', type: 'text', required: true, placeholder: 'Star Health Family Floater' },
      { key: 'policy_number', label: 'Policy Number', type: 'text', required: true, placeholder: 'MED123456' },
      { key: 'sum_insured', label: 'Sum Insured', type: 'number', required: true, placeholder: '500000', prefix: '₹' },
      { key: 'premium_yearly', label: 'Premium (Yearly)', type: 'number', required: true, placeholder: '12000', prefix: '₹' },
      { key: 'members_covered', label: 'Members Covered', type: 'text', placeholder: 'Self, Spouse, 2 Children' },
    ]
  },
  {
    key: 'motor_insurance',
    label: 'Motor Insurance',
    category: 'insurance',
    icon: 'car',
    color: '#F59E0B',
    fields: [
      { key: 'insurer_name', label: 'Insurer Name', type: 'text', required: true, placeholder: 'Bajaj Allianz' },
      { key: 'policy_number', label: 'Policy Number', type: 'text', required: true, placeholder: 'CAR123456' },
      { key: 'vehicle_number', label: 'Vehicle Number', type: 'text', required: true, placeholder: 'MH12AB1234' },
      { key: 'idv', label: 'IDV (Insured Declared Value)', type: 'number', required: true, placeholder: '800000', prefix: '₹' },
      { key: 'premium_yearly', label: 'Premium (Yearly)', type: 'number', required: true, placeholder: '18000', prefix: '₹' },
    ]
  },

  // Vehicles
  {
    key: 'vehicle_car',
    label: 'Vehicle (Car)',
    category: 'vehicle',
    icon: 'car-sport',
    color: '#6366F1',
    fields: [
      { key: 'make_model', label: 'Make & Model', type: 'text', required: true, placeholder: 'Honda City' },
      { key: 'registration_number', label: 'Registration Number', type: 'text', placeholder: 'MH12AB1234' },
      { key: 'insurance_valid_till', label: 'Insurance Valid Till', type: 'date', placeholder: '2025-12-31' },
    ]
  },
  {
    key: 'vehicle_two_wheeler',
    label: 'Vehicle (Two-Wheeler)',
    category: 'vehicle',
    icon: 'bicycle',
    color: '#EC4899',
    fields: [
      { key: 'make_model', label: 'Make & Model', type: 'text', required: true, placeholder: 'Honda Activa 6G' },
      { key: 'registration_number', label: 'Registration Number', type: 'text', placeholder: 'MH12CD5678' },
      { key: 'insurance_valid_till', label: 'Insurance Valid Till', type: 'date', placeholder: '2025-12-31' },
    ]
  },
  {
    key: 'vehicle_other',
    label: 'Vehicle (Other)',
    category: 'vehicle',
    icon: 'boat',
    color: '#8B5CF6',
    fields: [
      { key: 'make_model', label: 'Make & Model', type: 'text', required: true, placeholder: 'Royal Enfield Classic 350' },
      { key: 'vehicle_type', label: 'Vehicle Type', type: 'text', placeholder: 'Motorcycle' },
      { key: 'registration_number', label: 'Registration Number', type: 'text', placeholder: 'MH12EF9012' },
      { key: 'insurance_valid_till', label: 'Insurance Valid Till', type: 'date', placeholder: '2025-12-31' },
    ]
  },

  // Others
  {
    key: 'esop',
    label: 'ESOP',
    category: 'other',
    icon: 'briefcase',
    color: '#5B2FBF',
    fields: [
      { key: 'company_name', label: 'Company Name', type: 'text', required: true, placeholder: 'ABC Tech Pvt Ltd' },
      { key: 'number_of_shares', label: 'Number of Shares', type: 'number', required: true, placeholder: '1000' },
      { key: 'grant_date', label: 'Grant Date', type: 'date', required: true },
      { key: 'vesting_period', label: 'Vesting Period', type: 'text', placeholder: '4 years' },
      { key: 'exercise_price', label: 'Exercise Price (per share)', type: 'number', placeholder: '100', prefix: '₹' },
    ]
  },
  {
    key: 'private_equity',
    label: 'Private Equity',
    category: 'other',
    icon: 'cash',
    color: '#BE185D',
    fields: [
      { key: 'fund_name', label: 'Fund Name', type: 'text', required: true, placeholder: 'XYZ Private Equity Fund' },
      { key: 'fund_type', label: 'Fund Type', type: 'text', placeholder: 'Venture Capital' },
      { key: 'committed_amount', label: 'Committed Amount', type: 'number', placeholder: '5000000', prefix: '₹' },
    ]
  },
  {
    key: 'arts_artifacts',
    label: 'Arts & Artifacts',
    category: 'other',
    icon: 'color-palette',
    color: '#F97316',
    fields: [
      { key: 'item_type', label: 'Item Type', type: 'text', required: true, placeholder: 'Painting - Modern Art' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Description of the artwork' },
      { key: 'artist_name', label: 'Artist Name', type: 'text', placeholder: 'John Doe' },
    ]
  },
  {
    key: 'aif',
    label: 'Alternate Investment Fund',
    category: 'other',
    icon: 'layers',
    color: '#06B6D4',
    fields: [
      { key: 'fund_name', label: 'Fund Name', type: 'text', required: true, placeholder: 'ABC AIF Fund' },
      { key: 'fund_type', label: 'Fund Type', type: 'select', options: ['Category I', 'Category II', 'Category III'] },
      { key: 'commitment', label: 'Commitment', type: 'number', placeholder: '2000000', prefix: '₹' },
    ]
  },
  {
    key: 'crypto',
    label: 'Cryptocurrency',
    category: 'other',
    icon: 'logo-bitcoin',
    color: '#F7931A',
    fields: [
      { key: 'crypto_name', label: 'Cryptocurrency', type: 'text', required: true, placeholder: 'Bitcoin' },
      { key: 'quantity', label: 'Quantity', type: 'number', required: true, placeholder: '0.5' },
      { key: 'purchase_price_per_unit', label: 'Purchase Price (per unit)', type: 'number', required: true, placeholder: '3500000', prefix: '₹' },
      { key: 'current_price_per_unit', label: 'Current Price (per unit)', type: 'number', required: true, placeholder: '4200000', prefix: '₹' },
      { key: 'wallet_address', label: 'Wallet Address', type: 'text', placeholder: 'Optional' },
    ]
  },
  {
    key: 'others',
    label: 'Others',
    category: 'other',
    icon: 'ellipsis-horizontal-circle',
    color: '#64748B',
    fields: [
      { key: 'investment_name', label: 'Investment Name', type: 'text', required: true, placeholder: 'P2P Lending' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Describe your investment' },
    ]
  },
];

export const INVESTMENT_CATEGORIES = [
  { key: 'market', label: 'Market Investments', icon: 'trending-up', color: '#00E676' },
  { key: 'fixed_income', label: 'Fixed Income', icon: 'lock-closed', color: '#FFB300' },
  { key: 'physical', label: 'Physical Assets', icon: 'diamond', color: '#FF9100' },
  { key: 'insurance', label: 'Insurance', icon: 'shield', color: '#3F51B5' },
  { key: 'vehicle', label: 'Vehicles', icon: 'car', color: '#6366F1' },
  { key: 'other', label: 'Others', icon: 'apps', color: '#64748B' },
];

export const getInvestmentType = (key: string): InvestmentType | undefined => {
  return INVESTMENT_TYPES.find(t => t.key === key);
};

export const getInvestmentsByCategory = (category: string): InvestmentType[] => {
  return INVESTMENT_TYPES.filter(t => t.category === category);
};
