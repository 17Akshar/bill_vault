import { Category, Budget, CategoryBudget, SavingsGoal, BudgetSummary } from '../types';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export const api = {
  // Transactions
  getTransactions: async (startDate?: string, endDate?: string, category?: string, type?: string): Promise<any[]> => {
    let url = `${API_URL}/transactions?`;
    const params = [];
    if (startDate) params.push(`start_date=${startDate}`);
    if (endDate) params.push(`end_date=${endDate}`);
    if (category) params.push(`category=${category}`);
    if (type) params.push(`type=${type}`);
    url += params.join('&');
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch transactions');
    return response.json();
  },

  // Categories
  getCategories: async (): Promise<Category[]> => {
    const response = await fetch(`${API_URL}/categories`);
    if (!response.ok) throw new Error('Failed to fetch categories');
    return response.json();
  },

  createCategory: async (data: Omit<Category, '_id' | 'created_at'>): Promise<Category> => {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create category');
    return response.json();
  },

  seedCategories: async () => {
    const response = await fetch(`${API_URL}/categories/seed`, { method: 'POST' });
    if (!response.ok) throw new Error('Failed to seed categories');
    return response.json();
  },

  // Budget
  getBudget: async (): Promise<Budget> => {
    const response = await fetch(`${API_URL}/budget`);
    if (!response.ok) {
      if (response.status === 404) return null as any;
      throw new Error('Failed to fetch budget');
    }
    return response.json();
  },

  saveBudget: async (data: Omit<Budget, '_id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<Budget> => {
    const response = await fetch(`${API_URL}/budget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to save budget');
    return response.json();
  },

  // Category Budgets
  getCategoryBudgets: async (month: number, year: number): Promise<CategoryBudget[]> => {
    const response = await fetch(`${API_URL}/category-budgets?month=${month}&year=${year}`);
    if (!response.ok) throw new Error('Failed to fetch category budgets');
    return response.json();
  },

  createCategoryBudget: async (data: Omit<CategoryBudget, '_id' | 'user_id' | 'spent' | 'created_at' | 'updated_at'>): Promise<CategoryBudget> => {
    const response = await fetch(`${API_URL}/category-budgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create category budget');
    }
    return response.json();
  },

  updateCategoryBudget: async (id: string, data: Partial<CategoryBudget>): Promise<CategoryBudget> => {
    const response = await fetch(`${API_URL}/category-budgets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update category budget');
    return response.json();
  },

  deleteCategoryBudget: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/category-budgets/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete category budget');
  },

  // Savings Goals
  getSavingsGoals: async (): Promise<SavingsGoal[]> => {
    const response = await fetch(`${API_URL}/savings-goals`);
    if (!response.ok) throw new Error('Failed to fetch savings goals');
    return response.json();
  },

  createSavingsGoal: async (data: Omit<SavingsGoal, '_id' | 'user_id' | 'current_amount' | 'created_at' | 'updated_at'>): Promise<SavingsGoal> => {
    const response = await fetch(`${API_URL}/savings-goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create savings goal');
    return response.json();
  },

  updateSavingsGoal: async (id: string, data: Partial<SavingsGoal>): Promise<SavingsGoal> => {
    const response = await fetch(`${API_URL}/savings-goals/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update savings goal');
    return response.json();
  },

  deleteSavingsGoal: async (id: string): Promise<void> => {
    const response = await fetch(`${API_URL}/savings-goals/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete savings goal');
  },

  // Budget Summary
  getBudgetSummary: async (month: number, year: number): Promise<BudgetSummary> => {
    const response = await fetch(`${API_URL}/budget-summary?month=${month}&year=${year}`);
    if (!response.ok) throw new Error('Failed to fetch budget summary');
    return response.json();
  },

  // Import Budget
  importBudget: async (fromMonth: number, fromYear: number, toMonth: number, toYear: number) => {
    const response = await fetch(
      `${API_URL}/import-budget?from_month=${fromMonth}&from_year=${fromYear}&to_month=${toMonth}&to_year=${toYear}`,
      { method: 'POST' }
    );
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to import budget');
    }
    return response.json();
  },

  // Budget Templates
  getBudgetTemplates: async () => {
    const response = await fetch(`${API_URL}/budget/templates`);
    if (!response.ok) throw new Error('Failed to fetch templates');
    return response.json();
  },

  applyBudgetTemplate: async (templateId: string, month: number, year: number, overwrite: boolean = false) => {
    const response = await fetch(`${API_URL}/budget/apply-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: templateId, month, year, overwrite }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to apply template');
    }
    return response.json();
  },
};
