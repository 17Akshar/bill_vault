export type PaymentType = 'expense' | 'income';
export type FrequencyKey = 'one_time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type PaymentStatus = 'upcoming' | 'completed' | 'missed' | 'paused';
export type PaymentMethod = 'bank_transfer' | 'upi' | 'cash' | 'auto_debit' | 'cheque';

export interface PlannedPayment {
  id: string;
  title: string;
  amount: number;
  type: PaymentType;
  categoryId: string;
  categoryLabel: string;
  categoryIcon: string;
  categoryColor: string;
  accountId: string;
  accountLabel: string;
  payee: string;
  paymentMethod: PaymentMethod;
  frequency: FrequencyKey;
  startDate: string;
  nextDueDate: string;
  status: PaymentStatus;
  notes?: string;
  labels: string[];
  reminderDaysBefore: number;
  autoReminder: boolean;
  paymentHistory: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  status: 'paid' | 'missed' | 'skipped';
  notes?: string;
}

export interface CalendarEvent {
  date: string;
  payments: { id: string; title: string; amount: number; type: PaymentType; color: string }[];
}

export const FREQUENCY_OPTIONS: { key: FrequencyKey; label: string; description: string }[] = [
  { key: 'one_time', label: 'One Time', description: 'Pay once' },
  { key: 'daily', label: 'Daily', description: 'Every day' },
  { key: 'weekly', label: 'Weekly', description: 'Every week' },
  { key: 'monthly', label: 'Monthly', description: 'Every month' },
  { key: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
  { key: 'yearly', label: 'Yearly', description: 'Once a year' },
];

export const PAYMENT_CATEGORIES = [
  { id: 'emi', label: 'EMI', icon: 'cash-outline', color: '#EF4444' },
  { id: 'rent', label: 'Rent', icon: 'home-outline', color: '#F59E0B' },
  { id: 'salary', label: 'Salary', icon: 'briefcase-outline', color: '#22C55E' },
  { id: 'utilities', label: 'Utilities', icon: 'flash-outline', color: '#0EA5E9' },
  { id: 'insurance', label: 'Insurance', icon: 'shield-outline', color: '#8B5CF6' },
  { id: 'investment_sip', label: 'SIP / Investment', icon: 'trending-up-outline', color: '#6366F1' },
  { id: 'subscriptions', label: 'Subscriptions', icon: 'repeat-outline', color: '#EC4899' },
  { id: 'loan_emi', label: 'Loan EMI', icon: 'document-text-outline', color: '#FF9100' },
  { id: 'credit_card', label: 'Credit Card Bill', icon: 'card-outline', color: '#14B8A6' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export const PAYMENT_METHODS: { key: PaymentMethod; label: string; icon: string }[] = [
  { key: 'bank_transfer', label: 'Bank Transfer', icon: 'business-outline' },
  { key: 'upi', label: 'UPI', icon: 'phone-portrait-outline' },
  { key: 'auto_debit', label: 'Auto Debit', icon: 'repeat-outline' },
  { key: 'cash', label: 'Cash', icon: 'cash-outline' },
  { key: 'cheque', label: 'Cheque', icon: 'document-outline' },
];

export const DUMMY_PLANNED_PAYMENTS: PlannedPayment[] = [
  {
    id: '1',
    title: 'Home Loan EMI',
    amount: 32500,
    type: 'expense',
    categoryId: 'loan_emi',
    categoryLabel: 'Loan EMI',
    categoryIcon: 'document-text-outline',
    categoryColor: '#FF9100',
    accountId: 'hdfc',
    accountLabel: 'HDFC Bank ••1234',
    payee: 'HDFC Bank',
    paymentMethod: 'auto_debit',
    frequency: 'monthly',
    startDate: '01 Jan 2024',
    nextDueDate: '01 Jun 2024',
    status: 'upcoming',
    notes: 'Home loan EMI auto-debited on 1st of every month',
    labels: ['EMI', 'Home'],
    reminderDaysBefore: 3,
    autoReminder: true,
    paymentHistory: [
      { id: 'h1', date: '01 May 2024', amount: 32500, status: 'paid' },
      { id: 'h2', date: '01 Apr 2024', amount: 32500, status: 'paid' },
      { id: 'h3', date: '01 Mar 2024', amount: 32500, status: 'paid' },
    ],
  },
  {
    id: '2',
    title: 'Monthly Salary',
    amount: 120000,
    type: 'income',
    categoryId: 'salary',
    categoryLabel: 'Salary',
    categoryIcon: 'briefcase-outline',
    categoryColor: '#22C55E',
    accountId: 'icici',
    accountLabel: 'ICICI Bank ••5678',
    payee: 'Employer',
    paymentMethod: 'bank_transfer',
    frequency: 'monthly',
    startDate: '25 Jan 2024',
    nextDueDate: '25 Jun 2024',
    status: 'upcoming',
    notes: '',
    labels: ['Salary'],
    reminderDaysBefore: 0,
    autoReminder: false,
    paymentHistory: [
      { id: 'h4', date: '25 May 2024', amount: 120000, status: 'paid' },
      { id: 'h5', date: '25 Apr 2024', amount: 120000, status: 'paid' },
    ],
  },
  {
    id: '3',
    title: 'Netflix Subscription',
    amount: 649,
    type: 'expense',
    categoryId: 'subscriptions',
    categoryLabel: 'Subscriptions',
    categoryIcon: 'repeat-outline',
    categoryColor: '#EC4899',
    accountId: 'hdfc',
    accountLabel: 'HDFC Bank ••1234',
    payee: 'Netflix',
    paymentMethod: 'auto_debit',
    frequency: 'monthly',
    startDate: '15 Jan 2024',
    nextDueDate: '15 Jun 2024',
    status: 'upcoming',
    notes: '',
    labels: ['Entertainment', 'OTT'],
    reminderDaysBefore: 1,
    autoReminder: true,
    paymentHistory: [
      { id: 'h6', date: '15 May 2024', amount: 649, status: 'paid' },
    ],
  },
  {
    id: '4',
    title: 'SIP — Axis Bluechip',
    amount: 10000,
    type: 'expense',
    categoryId: 'investment_sip',
    categoryLabel: 'SIP / Investment',
    categoryIcon: 'trending-up-outline',
    categoryColor: '#6366F1',
    accountId: 'hdfc',
    accountLabel: 'HDFC Bank ••1234',
    payee: 'Axis Mutual Fund',
    paymentMethod: 'auto_debit',
    frequency: 'monthly',
    startDate: '10 Jan 2024',
    nextDueDate: '10 Jun 2024',
    status: 'upcoming',
    notes: 'Monthly SIP for long-term wealth creation',
    labels: ['Investment', 'SIP'],
    reminderDaysBefore: 2,
    autoReminder: true,
    paymentHistory: [
      { id: 'h7', date: '10 May 2024', amount: 10000, status: 'paid' },
      { id: 'h8', date: '10 Apr 2024', amount: 10000, status: 'paid' },
    ],
  },
  {
    id: '5',
    title: 'House Rent',
    amount: 25000,
    type: 'expense',
    categoryId: 'rent',
    categoryLabel: 'Rent',
    categoryIcon: 'home-outline',
    categoryColor: '#F59E0B',
    accountId: 'hdfc',
    accountLabel: 'HDFC Bank ••1234',
    payee: 'Landlord',
    paymentMethod: 'bank_transfer',
    frequency: 'monthly',
    startDate: '05 Jan 2024',
    nextDueDate: '05 Jun 2024',
    status: 'upcoming',
    notes: '',
    labels: ['Rent', 'Housing'],
    reminderDaysBefore: 3,
    autoReminder: true,
    paymentHistory: [
      { id: 'h9', date: '05 May 2024', amount: 25000, status: 'paid' },
    ],
  },
  {
    id: '6',
    title: 'Electricity Bill',
    amount: 3200,
    type: 'expense',
    categoryId: 'utilities',
    categoryLabel: 'Utilities',
    categoryIcon: 'flash-outline',
    categoryColor: '#0EA5E9',
    accountId: 'icici',
    accountLabel: 'ICICI Bank ••5678',
    payee: 'MSEDCL',
    paymentMethod: 'upi',
    frequency: 'monthly',
    startDate: '20 Jan 2024',
    nextDueDate: '20 Jun 2024',
    status: 'missed',
    notes: '',
    labels: ['Utility', 'Electricity'],
    reminderDaysBefore: 3,
    autoReminder: true,
    paymentHistory: [
      { id: 'h10', date: '20 Apr 2024', amount: 3100, status: 'paid' },
      { id: 'h11', date: '20 May 2024', amount: 3200, status: 'missed' },
    ],
  },
  {
    id: '7',
    title: 'Term Insurance Premium',
    amount: 18500,
    type: 'expense',
    categoryId: 'insurance',
    categoryLabel: 'Insurance',
    categoryIcon: 'shield-outline',
    categoryColor: '#8B5CF6',
    accountId: 'hdfc',
    accountLabel: 'HDFC Bank ••1234',
    payee: 'LIC',
    paymentMethod: 'auto_debit',
    frequency: 'yearly',
    startDate: '15 Mar 2024',
    nextDueDate: '15 Mar 2025',
    status: 'completed',
    notes: 'Annual life insurance premium',
    labels: ['Insurance'],
    reminderDaysBefore: 7,
    autoReminder: true,
    paymentHistory: [
      { id: 'h12', date: '15 Mar 2024', amount: 18500, status: 'paid' },
    ],
  },
  {
    id: '8',
    title: 'Freelance Income',
    amount: 35000,
    type: 'income',
    categoryId: 'salary',
    categoryLabel: 'Salary',
    categoryIcon: 'briefcase-outline',
    categoryColor: '#22C55E',
    accountId: 'icici',
    accountLabel: 'ICICI Bank ••5678',
    payee: 'Client',
    paymentMethod: 'bank_transfer',
    frequency: 'monthly',
    startDate: '28 Jan 2024',
    nextDueDate: '28 Jun 2024',
    status: 'upcoming',
    notes: 'Monthly freelance project payment',
    labels: ['Income', 'Freelance'],
    reminderDaysBefore: 0,
    autoReminder: false,
    paymentHistory: [],
  },
];

export const MONTHLY_CHART_DATA = [
  { month: 'Jan', expenses: 75000, income: 155000 },
  { month: 'Feb', expenses: 72000, income: 155000 },
  { month: 'Mar', expenses: 91500, income: 155000 },
  { month: 'Apr', expenses: 70000, income: 155000 },
  { month: 'May', expenses: 68849, income: 155000 },
  { month: 'Jun', expenses: 71349, income: 155000 },
];
