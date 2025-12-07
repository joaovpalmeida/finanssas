export enum TransactionType {
  INCOME = 'Income',
  EXPENSE = 'Expense',
  TRANSFER = 'Transfer',
  UNKNOWN = 'Unknown'
}

export type CategoryGroup = 'Recurring' | 'General';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  group: CategoryGroup;
}

export interface Account {
  id: string;
  name: string;
  isSavings: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  
  // Foreign Keys
  categoryId: string;
  accountId: string;

  // Display Names (Populated via JOINs)
  category: string;
  account: string;
  
  type: TransactionType;
  balanceAfterTransaction?: number;
}

export interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  topCategories: { name: string; value: number }[];
  expenseByGroup: { name: string; value: number }[];
  monthlyData: { month: string; income: number; expense: number }[];
  accountBalances: { account: string; balance: number }[];
}

export interface AiInsight {
  title: string;
  content: string;
  type: 'positive' | 'negative' | 'neutral' | 'action';
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  deadline: string;
  targetAccounts: string[]; // Stores Account IDs
}

export interface SearchFilters {
  keyword?: string;
  category?: string;
  account?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
}

export interface FiscalConfig {
  mode: 'calendar' | 'fixed_day' | 'income_trigger';
  startDay?: number; // 1-31, used if mode is 'fixed_day'
  triggerCategory?: string; // category ID or Name, used if mode is 'income_trigger'
}