// Dummy data for Expense module — demo-only, used as fallback when backend is empty
import { addDays, format } from 'date-fns';

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
  date: string;
  account: string;
  accountLabel: string;
  paymentMode: string;
  description?: string;
  notes?: string;
  tags?: string[];
  billUrl?: string;
  isRecurring: boolean;
  reminderSet: boolean;
  reminderDate?: string;
}

export interface ExpenseCategoryBreakdown {
  key: string;
  label: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface ExpenseReminder {
  id: string;
  title: string;
  amount: number;
  type: 'expense' | 'bill' | 'subscription' | 'emi';
  dueDate: string;
  repeat: 'one_time' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  note?: string;
  status: 'upcoming' | 'missed' | 'done';
}

export const EXPENSE_CAT_COLORS: Record<string, string> = {
  housing: '#FF5252',
  food: '#448AFF',
  transport: '#00BCD4',
  shopping: '#FFB300',
  entertainment: '#7C4DFF',
  health: '#00E676',
  education: '#FF9100',
  bills: '#E91E63',
  travel: '#26C6DA',
  personal: '#66BB6A',
  emi: '#FF7043',
  investment: '#AB47BC',
  groceries: '#4FC3F7',
  other: '#607D8B',
};

export const EXPENSE_CATEGORIES = [
  { key: 'food',          label: 'Food & Dining',    icon: 'restaurant-outline',        color: '#448AFF' },
  { key: 'groceries',     label: 'Groceries',         icon: 'basket-outline',            color: '#4FC3F7' },
  { key: 'transport',     label: 'Transport',         icon: 'car-outline',               color: '#00BCD4' },
  { key: 'shopping',      label: 'Shopping',          icon: 'cart-outline',              color: '#FFB300' },
  { key: 'housing',       label: 'Housing / Rent',    icon: 'home-outline',              color: '#FF5252' },
  { key: 'bills',         label: 'Bills & Utilities', icon: 'flash-outline',             color: '#E91E63' },
  { key: 'health',        label: 'Health',            icon: 'medkit-outline',            color: '#00E676' },
  { key: 'education',     label: 'Education',         icon: 'school-outline',            color: '#FF9100' },
  { key: 'entertainment', label: 'Entertainment',     icon: 'film-outline',              color: '#7C4DFF' },
  { key: 'travel',        label: 'Travel',            icon: 'airplane-outline',          color: '#26C6DA' },
  { key: 'personal',      label: 'Personal Care',     icon: 'person-outline',            color: '#66BB6A' },
  { key: 'emi',           label: 'EMI / Loan',        icon: 'card-outline',              color: '#FF7043' },
  { key: 'investment',    label: 'Investment',        icon: 'trending-up-outline',       color: '#AB47BC' },
  { key: 'other',         label: 'Others',            icon: 'ellipsis-horizontal-outline', color: '#607D8B' },
];

export const PAYMENT_MODES = [
  { key: 'upi',           label: 'UPI',              icon: 'phone-portrait-outline' },
  { key: 'bank_transfer', label: 'Bank Transfer',    icon: 'swap-horizontal-outline' },
  { key: 'cash',          label: 'Cash',             icon: 'cash-outline' },
  { key: 'credit_card',   label: 'Credit Card',      icon: 'card-outline' },
  { key: 'debit_card',    label: 'Debit Card',       icon: 'card-outline' },
  { key: 'net_banking',   label: 'Net Banking',      icon: 'globe-outline' },
  { key: 'cheque',        label: 'Cheque',           icon: 'document-outline' },
  { key: 'wallet',        label: 'Wallet',           icon: 'wallet-outline' },
];

export const DEMO_ACCOUNTS = [
  { account_id: 'demo_hdfc',  name: 'HDFC Bank',   account_type: 'bank',  balance: 285000 },
  { account_id: 'demo_icici', name: 'ICICI Bank',  account_type: 'bank',  balance: 142000 },
  { account_id: 'demo_sbi',   name: 'SBI Savings', account_type: 'bank',  balance: 65000  },
  { account_id: 'demo_cash',  name: 'Cash',        account_type: 'cash',  balance: 8000   },
];

const today = new Date();
const d = (k: number) => format(addDays(today, -k), 'yyyy-MM-dd');

export const DEMO_EXPENSES: ExpenseItem[] = [
  { id: 'e1',  title: 'Swiggy',          amount: 650,   category: 'food',          categoryLabel: 'Food & Dining',    categoryIcon: 'restaurant-outline', categoryColor: '#448AFF', date: d(1),   account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'upi',         description: 'Dinner order',           isRecurring: false, reminderSet: false, tags: ['dinner'] },
  { id: 'e2',  title: 'Uber',            amount: 320,   category: 'transport',     categoryLabel: 'Transport',        categoryIcon: 'car-outline',        categoryColor: '#00BCD4', date: d(2),   account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'upi',         description: 'Office commute',         isRecurring: false, reminderSet: false },
  { id: 'e3',  title: 'Amazon',          amount: 1250,  category: 'shopping',      categoryLabel: 'Shopping',         categoryIcon: 'cart-outline',       categoryColor: '#FFB300', date: d(3),   account: 'demo_icici', accountLabel: 'ICICI Bank',  paymentMode: 'credit_card', description: 'Headphones',             isRecurring: false, reminderSet: false, tags: ['electronics'] },
  { id: 'e4',  title: 'Rent',            amount: 25000, category: 'housing',       categoryLabel: 'Housing / Rent',   categoryIcon: 'home-outline',       categoryColor: '#FF5252', date: d(1),   account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'bank_transfer', description: 'Monthly rent',           isRecurring: true,  reminderSet: true,  reminderDate: d(-29) },
  { id: 'e5',  title: 'Big Basket',      amount: 2800,  category: 'groceries',     categoryLabel: 'Groceries',        categoryIcon: 'basket-outline',     categoryColor: '#4FC3F7', date: d(5),   account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'upi',         description: 'Weekly groceries',       isRecurring: false, reminderSet: false },
  { id: 'e6',  title: 'Netflix',         amount: 649,   category: 'entertainment', categoryLabel: 'Entertainment',    categoryIcon: 'film-outline',       categoryColor: '#7C4DFF', date: d(6),   account: 'demo_icici', accountLabel: 'ICICI Bank',  paymentMode: 'credit_card', description: 'Monthly subscription',   isRecurring: true,  reminderSet: true,  reminderDate: d(-29) },
  { id: 'e7',  title: 'Electricity Bill', amount: 1800, category: 'bills',         categoryLabel: 'Bills & Utilities', categoryIcon: 'flash-outline',     categoryColor: '#E91E63', date: d(7),   account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'net_banking', description: 'Monthly bill',           isRecurring: true,  reminderSet: true },
  { id: 'e8',  title: 'Apollo Pharmacy', amount: 450,   category: 'health',        categoryLabel: 'Health',           categoryIcon: 'medkit-outline',     categoryColor: '#00E676', date: d(8),   account: 'demo_cash',  accountLabel: 'Cash',        paymentMode: 'cash',        description: 'Medicines',              isRecurring: false, reminderSet: false },
  { id: 'e9',  title: 'Dominos',         amount: 520,   category: 'food',          categoryLabel: 'Food & Dining',    categoryIcon: 'restaurant-outline', categoryColor: '#448AFF', date: d(9),   account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'upi',         description: 'Pizza order',            isRecurring: false, reminderSet: false, tags: ['lunch'] },
  { id: 'e10', title: 'Zara',            amount: 3200,  category: 'shopping',      categoryLabel: 'Shopping',         categoryIcon: 'cart-outline',       categoryColor: '#FFB300', date: d(10),  account: 'demo_icici', accountLabel: 'ICICI Bank',  paymentMode: 'credit_card', description: 'Shirt and trousers',     isRecurring: false, reminderSet: false, tags: ['clothes'] },
  { id: 'e11', title: 'Rapido',          amount: 180,   category: 'transport',     categoryLabel: 'Transport',        categoryIcon: 'car-outline',        categoryColor: '#00BCD4', date: d(11),  account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'upi',         description: 'Bike taxi',              isRecurring: false, reminderSet: false },
  { id: 'e12', title: 'PVR Cinemas',     amount: 850,   category: 'entertainment', categoryLabel: 'Entertainment',    categoryIcon: 'film-outline',       categoryColor: '#7C4DFF', date: d(12),  account: 'demo_icici', accountLabel: 'ICICI Bank',  paymentMode: 'credit_card', description: 'Movie tickets',          isRecurring: false, reminderSet: false },
  { id: 'e13', title: 'Internet Bill',   amount: 999,   category: 'bills',         categoryLabel: 'Bills & Utilities', categoryIcon: 'flash-outline',     categoryColor: '#E91E63', date: d(13),  account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'net_banking', description: 'Monthly broadband',      isRecurring: true,  reminderSet: true },
  { id: 'e14', title: 'Zepto',           amount: 1100,  category: 'groceries',     categoryLabel: 'Groceries',        categoryIcon: 'basket-outline',     categoryColor: '#4FC3F7', date: d(14),  account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'upi',         description: 'Quick grocery run',      isRecurring: false, reminderSet: false },
  { id: 'e15', title: 'Car EMI',         amount: 8500,  category: 'emi',           categoryLabel: 'EMI / Loan',       categoryIcon: 'card-outline',       categoryColor: '#FF7043', date: d(1),   account: 'demo_hdfc',  accountLabel: 'HDFC Bank',   paymentMode: 'bank_transfer', description: 'Car loan EMI',           isRecurring: true,  reminderSet: true,  reminderDate: d(-29) },
];

export const DEMO_CATEGORY_BREAKDOWN: ExpenseCategoryBreakdown[] = [
  { key: 'housing',       label: 'Housing',       icon: 'home-outline',         color: '#FF5252', amount: 25000, percentage: 33, count: 1 },
  { key: 'food',          label: 'Food & Dining', icon: 'restaurant-outline',   color: '#448AFF', amount: 15000, percentage: 20, count: 5 },
  { key: 'transport',     label: 'Transport',     icon: 'car-outline',          color: '#00BCD4', amount: 10000, percentage: 13, count: 4 },
  { key: 'shopping',      label: 'Shopping',      icon: 'cart-outline',         color: '#FFB300', amount: 8000,  percentage: 11, count: 3 },
  { key: 'entertainment', label: 'Entertainment', icon: 'film-outline',         color: '#7C4DFF', amount: 7000,  percentage: 9,  count: 2 },
  { key: 'other',         label: 'Others',        icon: 'ellipsis-horizontal-outline', color: '#607D8B', amount: 10000, percentage: 14, count: 5 },
];

// 6-month monthly totals for charts
export const DEMO_MONTHLY_TREND = [
  { label: 'Jan', value: 55000 },
  { label: 'Feb', value: 62000 },
  { label: 'Mar', value: 48000 },
  { label: 'Apr', value: 71000 },
  { label: 'May', value: 58000 },
  { label: 'Jun', value: 75000 },
];

export const DEMO_REMINDERS: ExpenseReminder[] = [
  { id: 'r1', title: 'Rent Due',        amount: 25000, type: 'bill',         dueDate: d(-2),  repeat: 'monthly', note: 'Pay before 5th',      status: 'upcoming' },
  { id: 'r2', title: 'Netflix',         amount: 649,   type: 'subscription', dueDate: d(-5),  repeat: 'monthly', note: 'Auto-debit',           status: 'upcoming' },
  { id: 'r3', title: 'Car EMI',         amount: 8500,  type: 'emi',          dueDate: d(0),   repeat: 'monthly', note: 'HDFC Auto-debit',      status: 'upcoming' },
  { id: 'r4', title: 'Electricity Bill', amount: 1800, type: 'bill',         dueDate: d(5),   repeat: 'monthly', note: 'BESCOM portal',        status: 'upcoming' },
  { id: 'r5', title: 'Amazon Prime',    amount: 299,   type: 'subscription', dueDate: d(-10), repeat: 'monthly', note: 'Annual plan - monthly', status: 'missed'  },
];
