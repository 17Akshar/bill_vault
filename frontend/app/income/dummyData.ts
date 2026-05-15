// Dummy data for Income module — demo-only, used as fallback when backend is empty
import { addDays, format } from 'date-fns';

export const DEMO_ACCOUNTS = [
  { account_id: 'demo_hdfc', name: 'HDFC Bank',  account_type: 'bank', account_number: '1234', balance: 285000 },
  { account_id: 'demo_icici', name: 'ICICI Bank', account_type: 'bank', account_number: '5678', balance: 142000 },
  { account_id: 'demo_sbi',  name: 'SBI Savings', account_type: 'bank', account_number: '9012', balance: 65000 },
];

const today = new Date();
const d = (k: number) => format(addDays(today, -k), 'yyyy-MM-dd');

// Build a realistic distribution of ~24 income entries over the last 90 days
export const DEMO_INCOMES = [
  // Recurring monthly salary
  { income_id: 'd1',  amount: 100000, category: 'salary',     source: 'Acme Corp',         account_id: 'demo_hdfc',  family_member_id: null, date: d(2),  labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd2',  amount: 100000, category: 'salary',     source: 'Acme Corp',         account_id: 'demo_hdfc',  family_member_id: null, date: d(32), labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd3',  amount: 100000, category: 'salary',     source: 'Acme Corp',         account_id: 'demo_hdfc',  family_member_id: null, date: d(62), labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  // Freelance
  { income_id: 'd4',  amount: 20000,  category: 'freelance',  source: 'Design Co. Project', account_id: 'demo_icici', family_member_id: null, date: d(5),  labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: 'Logo design' },
  { income_id: 'd5',  amount: 15000,  category: 'freelance',  source: 'Code Studio',       account_id: 'demo_icici', family_member_id: null, date: d(34), labels: ['taxable', 'mode:upi'], notes: 'Bug fixes' },
  { income_id: 'd6',  amount: 22000,  category: 'freelance',  source: 'BrandWorks',        account_id: 'demo_icici', family_member_id: null, date: d(65), labels: ['taxable', 'mode:bank_transfer'], notes: 'Brand identity gig' },
  // Investments / dividends
  { income_id: 'd7',  amount: 5000,   category: 'investment', source: 'HDFC Mutual Fund',  account_id: 'demo_hdfc',  family_member_id: null, date: d(7),  labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: 'Monthly SIP returns' },
  { income_id: 'd8',  amount: 4500,   category: 'investment', source: 'Nifty 50 ETF',      account_id: 'demo_hdfc',  family_member_id: null, date: d(38), labels: ['taxable', 'mode:bank_transfer'], notes: 'Dividend' },
  { income_id: 'd9',  amount: 12000,  category: 'investment', source: 'TCS Stock',         account_id: 'demo_hdfc',  family_member_id: null, date: d(70), labels: ['taxable', 'mode:bank_transfer'], notes: 'Quarterly dividend' },
  // Rental
  { income_id: 'd10', amount: 18000,  category: 'rental',     source: '1BHK Andheri',      account_id: 'demo_sbi',   family_member_id: null, date: d(3),  labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd11', amount: 18000,  category: 'rental',     source: '1BHK Andheri',      account_id: 'demo_sbi',   family_member_id: null, date: d(33), labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd12', amount: 18000,  category: 'rental',     source: '1BHK Andheri',      account_id: 'demo_sbi',   family_member_id: null, date: d(63), labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  // Business
  { income_id: 'd13', amount: 35000,  category: 'business',   source: 'Side Project Sales', account_id: 'demo_icici', family_member_id: null, date: d(10), labels: ['taxable', 'mode:upi'], notes: 'Course sales batch' },
  { income_id: 'd14', amount: 28000,  category: 'business',   source: 'Side Project Sales', account_id: 'demo_icici', family_member_id: null, date: d(45), labels: ['taxable', 'mode:upi'], notes: null },
  // Gift / refund — non-taxable
  { income_id: 'd15', amount: 5100,   category: 'gift',       source: 'Birthday Gift',     account_id: 'demo_hdfc',  family_member_id: null, date: d(15), labels: ['mode:cash'], notes: 'From parents' },
  { income_id: 'd16', amount: 3500,   category: 'refund',     source: 'Amazon Refund',     account_id: 'demo_hdfc',  family_member_id: null, date: d(20), labels: ['mode:upi'], notes: 'Returned headphones' },
  // Older history for trend chart
  { income_id: 'd17', amount: 95000,  category: 'salary',     source: 'Acme Corp',         account_id: 'demo_hdfc',  family_member_id: null, date: d(92),  labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd18', amount: 95000,  category: 'salary',     source: 'Acme Corp',         account_id: 'demo_hdfc',  family_member_id: null, date: d(122), labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd19', amount: 90000,  category: 'salary',     source: 'Acme Corp',         account_id: 'demo_hdfc',  family_member_id: null, date: d(152), labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd20', amount: 12000,  category: 'freelance',  source: 'Design Co. Project', account_id: 'demo_icici', family_member_id: null, date: d(95),  labels: ['taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd21', amount: 14000,  category: 'freelance',  source: 'Code Studio',       account_id: 'demo_icici', family_member_id: null, date: d(125), labels: ['taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd22', amount: 18000,  category: 'rental',     source: '1BHK Andheri',      account_id: 'demo_sbi',   family_member_id: null, date: d(93),  labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd23', amount: 18000,  category: 'rental',     source: '1BHK Andheri',      account_id: 'demo_sbi',   family_member_id: null, date: d(123), labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
  { income_id: 'd24', amount: 4000,   category: 'investment', source: 'HDFC Mutual Fund',  account_id: 'demo_hdfc',  family_member_id: null, date: d(94),  labels: ['recurring', 'freq:monthly', 'taxable', 'mode:bank_transfer'], notes: null },
];

// Dummy total outflow for last 90 days for the Inflow / Outflow card pair
export const DEMO_OUTFLOW_BY_MONTH: Record<string, number> = {
  // index 0 = current month (last 30 days), 1 = month -1, 2 = month -2
  '0': 75000,
  '1': 68000,
  '2': 72000,
};
