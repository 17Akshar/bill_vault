// Shared dummy data for Budget module (Steps 1-9 — backend wired in Step 10)

export const CAT_COLORS: Record<string, string> = {
  food: '#FF5252',
  groceries: '#4CAF50',
  transport: '#448AFF',
  shopping: '#7C4DFF',
  bills: '#00BCD4',
  rent: '#E91E63',
  emi: '#FF7043',
  health: '#00E676',
  education: '#FFB300',
  entertainment: '#FF9100',
  travel: '#26C6DA',
  personal: '#AB47BC',
  investment: '#00C48C',
  other: '#607D8B',
};

export type BudgetCategory = {
  key: string;
  label: string;
  icon: string;
  color: string;
  budget: number;
  spent: number;
  alert_pct: number;
  notes: string;
};

export type TotalBudget = {
  period: 'monthly' | 'yearly';
  amount: number;
  start_month: string;
  auto_carry_forward: boolean;
};

export type SavingsGoal = {
  goal_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
};

export type MonthlyBar = { month: string; income: number; expense: number };

export const DUMMY_BUDGET_CATEGORIES: BudgetCategory[] = [
  { key: 'rent',          label: 'Home',          icon: 'home-outline',            color: '#E91E63', budget: 20000, spent: 20000, alert_pct: 90, notes: '' },
  { key: 'food',          label: 'Food & Dining',  icon: 'restaurant-outline',      color: '#FF5252', budget: 15000, spent: 12340, alert_pct: 80, notes: '' },
  { key: 'shopping',      label: 'Shopping',       icon: 'cart-outline',            color: '#7C4DFF', budget: 10000, spent: 11500, alert_pct: 80, notes: 'Includes online' },
  { key: 'investment',    label: 'Investments',    icon: 'trending-up-outline',     color: '#00C48C', budget: 15000, spent: 12000, alert_pct: 100, notes: '' },
  { key: 'education',     label: 'Education',      icon: 'school-outline',          color: '#FFB300', budget: 6000,  spent: 4500,  alert_pct: 80, notes: '' },
  { key: 'health',        label: 'Health',         icon: 'medkit-outline',          color: '#00E676', budget: 4000,  spent: 2100,  alert_pct: 80, notes: '' },
  { key: 'transport',     label: 'Transport',      icon: 'car-outline',             color: '#448AFF', budget: 5000,  spent: 3200,  alert_pct: 85, notes: '' },
  { key: 'entertainment', label: 'Entertainment',  icon: 'film-outline',            color: '#FF9100', budget: 3000,  spent: 1800,  alert_pct: 80, notes: '' },
  { key: 'other',         label: 'Others',         icon: 'ellipsis-horizontal-outline', color: '#607D8B', budget: 5000, spent: 2300, alert_pct: 80, notes: '' },
];

export const DUMMY_TOTAL_BUDGET: TotalBudget = {
  period: 'monthly',
  amount: 83000,
  start_month: 'May 2024',
  auto_carry_forward: true,
};

export const DUMMY_INCOME = 120000;
export const DUMMY_SAVINGS_GOALS: SavingsGoal[] = [
  { goal_id: 'sg1', name: 'Emergency Fund', target_amount: 100000, current_amount: 45000, target_date: '2024-12-31' },
  { goal_id: 'sg2', name: 'Vacation',        target_amount: 50000,  current_amount: 18000, target_date: '2024-10-31' },
  { goal_id: 'sg3', name: 'New Laptop',      target_amount: 80000,  current_amount: 32000, target_date: '2025-03-31' },
];

export const MONTHLY_BARS: MonthlyBar[] = [
  { month: 'Dec', income: 110000, expense: 72000 },
  { month: 'Jan', income: 115000, expense: 78000 },
  { month: 'Feb', income: 112000, expense: 65000 },
  { month: 'Mar', income: 118000, expense: 82000 },
  { month: 'Apr', income: 120000, expense: 75000 },
  { month: 'May', income: 120000, expense: 69740 },
];

export const SMART_SUGGESTIONS = [
  { icon: 'trending-down-outline', color: '#FF5252', text: 'Shopping is 15% over budget — consider reviewing subscriptions.' },
  { icon: 'checkmark-circle-outline', color: '#00E676', text: 'Great job! You saved 41.9% of income this month.' },
  { icon: 'alert-circle-outline', color: '#FFB300', text: 'Food & Dining at 82% — slow down for the rest of the month.' },
  { icon: 'star-outline', color: '#448AFF', text: 'Investment target on track. Keep it up!' },
];

export const PREVIOUS_MONTH = {
  label: 'April 2024',
  total_budget: 80000,
  categories: DUMMY_BUDGET_CATEGORIES.map(c => ({ ...c, budget: Math.round(c.budget * 0.97) })),
  savings_goal: { name: 'Emergency Fund', target_amount: 100000, current_amount: 38000 },
};
