export interface Category {
  _id?: string;
  name: string;
  icon: string;
  type: 'expense' | 'income';
  is_custom: boolean;
  default_budget: number;
  created_at?: string;
}

export interface Budget {
  _id?: string;
  user_id: string;
  total_budget: number;
  period: 'monthly' | 'yearly' | 'custom';
  start_date: string;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryBudget {
  _id?: string;
  user_id: string;
  category_name: string;
  category_icon: string;
  budget_amount: number;
  spent: number;
  period: string;
  alert_limit: number;
  notes?: string;
  month: number;
  year: number;
  created_at?: string;
  updated_at?: string;
}

export interface SavingsGoal {
  _id?: string;
  user_id: string;
  goal_amount: number;
  current_amount: number;
  target_date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BudgetSummary {
  total_budget: number;
  total_spent: number;
  remaining_budget: number;
  income: number;
  expenses: number;
  savings: number;
  savings_rate: number;
  categories: CategorySummaryItem[];
  month: number;
  year: number;
  currency: string;
}

export interface CategorySummaryItem {
  id: string;
  category: string;
  icon: string;
  budget: number;
  spent: number;
  remaining: number;
  progress: number;
  alert_limit: number;
}
