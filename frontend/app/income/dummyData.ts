// Dummy data for Income / Cash Flow module
import { addDays, format } from 'date-fns';

export const DEMO_ACCOUNTS = [
  { account_id: 'demo_hdfc',  name: 'HDFC Bank',   account_type: 'bank', account_number: '1234', balance: 285000 },
  { account_id: 'demo_icici', name: 'ICICI Bank',  account_type: 'bank', account_number: '5678', balance: 142000 },
  { account_id: 'demo_sbi',   name: 'SBI Savings', account_type: 'bank', account_number: '9012', balance: 65000  },
  { account_id: 'demo_cash',  name: 'Cash',        account_type: 'cash', account_number: '',     balance: 8000   },
];

export const DEMO_MEMBERS = [
  { family_member_id: 'self',   name: 'Self',   relation: 'self'   },
  { family_member_id: 'spouse', name: 'Spouse', relation: 'spouse' },
  { family_member_id: 'parent', name: 'Parent', relation: 'parent' },
];

const today = new Date();
const d = (k: number) => format(addDays(today, -k), 'yyyy-MM-dd');

export const DEMO_INCOMES = [
  { income_id: 'd1',  amount: 100000, category: 'salary',     source: 'Acme Corp',          account_id: 'demo_hdfc',  family_member_id: 'self',   date: d(2),   payment_mode: 'bank_transfer', income_type: 'salary',     is_taxable: true,  is_recurring: true,  frequency: 'monthly',   notes: 'Monthly salary',     location: 'Mumbai', labels: ['recurring','freq:monthly','taxable','mode:bank_transfer'] },
  { income_id: 'd2',  amount: 20000,  category: 'freelance',  source: 'Design Co. Project', account_id: 'demo_icici', family_member_id: 'self',   date: d(5),   payment_mode: 'bank_transfer', income_type: 'freelance',  is_taxable: true,  is_recurring: true,  frequency: 'monthly',   notes: 'Logo design',        location: '',       labels: ['recurring','freq:monthly','taxable','mode:bank_transfer'] },
  { income_id: 'd3',  amount: 5000,   category: 'investment', source: 'HDFC Mutual Fund',   account_id: 'demo_hdfc',  family_member_id: 'self',   date: d(7),   payment_mode: 'bank_transfer', income_type: 'investment', is_taxable: true,  is_recurring: true,  frequency: 'monthly',   notes: 'SIP returns',        location: '',       labels: ['recurring','freq:monthly','taxable','mode:bank_transfer'] },
  { income_id: 'd4',  amount: 18000,  category: 'rental',     source: '1BHK Andheri',       account_id: 'demo_sbi',   family_member_id: 'spouse', date: d(3),   payment_mode: 'bank_transfer', income_type: 'rental',     is_taxable: true,  is_recurring: true,  frequency: 'monthly',   notes: 'Monthly rent',       location: 'Andheri', labels: ['recurring','freq:monthly','taxable','mode:bank_transfer'] },
  { income_id: 'd5',  amount: 5100,   category: 'gift',       source: 'Birthday Gift',      account_id: 'demo_hdfc',  family_member_id: 'self',   date: d(15),  payment_mode: 'cash',          income_type: 'gift',       is_taxable: false, is_recurring: false, frequency: '',          notes: 'From parents',       location: '',       labels: ['mode:cash'] },
  { income_id: 'd6',  amount: 3500,   category: 'refund',     source: 'Amazon Refund',      account_id: 'demo_hdfc',  family_member_id: 'self',   date: d(20),  payment_mode: 'upi',           income_type: 'other',      is_taxable: false, is_recurring: false, frequency: '',          notes: 'Returned headphones', location: '',      labels: ['mode:upi'] },
  // Prior month
  { income_id: 'd7',  amount: 100000, category: 'salary',     source: 'Acme Corp',          account_id: 'demo_hdfc',  family_member_id: 'self',   date: d(32),  payment_mode: 'bank_transfer', income_type: 'salary',     is_taxable: true,  is_recurring: true,  frequency: 'monthly',   notes: '',               location: '', labels: ['recurring','freq:monthly','taxable','mode:bank_transfer'] },
  { income_id: 'd8',  amount: 15000,  category: 'freelance',  source: 'Code Studio',        account_id: 'demo_icici', family_member_id: 'self',   date: d(34),  payment_mode: 'bank_transfer', income_type: 'freelance',  is_taxable: true,  is_recurring: false, frequency: '',          notes: 'Bug fixes',      location: '', labels: ['taxable','mode:upi'] },
  { income_id: 'd9',  amount: 18000,  category: 'rental',     source: '1BHK Andheri',       account_id: 'demo_sbi',   family_member_id: 'spouse', date: d(33),  payment_mode: 'bank_transfer', income_type: 'rental',     is_taxable: true,  is_recurring: true,  frequency: 'monthly',   notes: '',               location: '', labels: ['recurring','freq:monthly','taxable','mode:bank_transfer'] },
  // Older history
  { income_id: 'd10', amount: 95000,  category: 'salary',     source: 'Acme Corp',          account_id: 'demo_hdfc',  family_member_id: 'self',   date: d(62),  payment_mode: 'bank_transfer', income_type: 'salary',     is_taxable: true,  is_recurring: true,  frequency: 'monthly',   notes: '',               location: '', labels: ['recurring','freq:monthly','taxable','mode:bank_transfer'] },
  { income_id: 'd11', amount: 22000,  category: 'freelance',  source: 'BrandWorks',         account_id: 'demo_icici', family_member_id: 'self',   date: d(65),  payment_mode: 'bank_transfer', income_type: 'freelance',  is_taxable: true,  is_recurring: false, frequency: '',          notes: 'Brand identity gig', location: '', labels: ['taxable','mode:bank_transfer'] },
  { income_id: 'd12', amount: 18000,  category: 'rental',     source: '1BHK Andheri',       account_id: 'demo_sbi',   family_member_id: 'spouse', date: d(63),  payment_mode: 'bank_transfer', income_type: 'rental',     is_taxable: true,  is_recurring: true,  frequency: 'monthly',   notes: '',               location: '', labels: ['recurring','freq:monthly','taxable','mode:bank_transfer'] },
  { income_id: 'd13', amount: 4500,   category: 'investment', source: 'Nifty 50 ETF',       account_id: 'demo_hdfc',  family_member_id: 'self',   date: d(68),  payment_mode: 'bank_transfer', income_type: 'investment', is_taxable: true,  is_recurring: false, frequency: '',          notes: 'Dividend',       location: '', labels: ['taxable','mode:bank_transfer'] },
];

export const DEMO_OUTFLOW_BY_MONTH: Record<string, number> = {
  '0': 75000, '1': 68000, '2': 72000,
};

export const DEMO_MONTHLY_TREND = [
  { label: 'Jan', income: 118000, expense: 55000 },
  { label: 'Feb', income: 125000, expense: 62000 },
  { label: 'Mar', income: 105000, expense: 48000 },
  { label: 'Apr', income: 142000, expense: 71000 },
  { label: 'May', income: 110000, expense: 58000 },
  { label: 'Jun', income: 125000, expense: 75000 },
];

export const DEMO_SOURCE_BREAKDOWN = [
  { key: 'salary',     label: 'Salary',      icon: 'briefcase-outline',    color: '#00E676', amount: 100000, percentage: 80, growth: 15, frequency: 'Monthly' },
  { key: 'freelance',  label: 'Freelance',   icon: 'laptop-outline',       color: '#448AFF', amount: 20000,  percentage: 16, growth: 25, frequency: 'Monthly' },
  { key: 'investment', label: 'Investments', icon: 'trending-up-outline',  color: '#7C4DFF', amount: 5000,   percentage: 4,  growth: 10, frequency: 'Monthly' },
];

export const DEMO_REMINDERS = [
  { id: 'ir1', title: 'Salary Credit',       type: 'salary',    amount: 100000, dueDate: d(-1),  repeat: 'monthly',   note: 'Acme Corp payroll',   status: 'upcoming' },
  { id: 'ir2', title: 'Freelance Payment',   type: 'freelance', amount: 20000,  dueDate: d(-5),  repeat: 'monthly',   note: 'Design Co. invoice',  status: 'upcoming' },
  { id: 'ir3', title: 'Rental Income',       type: 'rental',    amount: 18000,  dueDate: d(-3),  repeat: 'monthly',   note: '1BHK Andheri tenant', status: 'upcoming' },
  { id: 'ir4', title: 'Dividend — Nifty 50', type: 'dividend',  amount: 4500,   dueDate: d(10),  repeat: 'quarterly', note: 'ETF dividend',         status: 'upcoming' },
  { id: 'ir5', title: 'SIP Returns',         type: 'dividend',  amount: 5000,   dueDate: d(-8),  repeat: 'monthly',   note: 'HDFC MF',             status: 'missed'   },
];
