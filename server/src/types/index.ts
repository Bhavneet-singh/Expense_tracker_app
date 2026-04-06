export enum ExpenseCategory {
  FOOD = "food",
  TRANSPORT = "transport",
  UTILITIES = "utilities",
  ENTERTAINMENT = "entertainment",
  HEALTHCARE = "healthcare",
  SHOPPING = "shopping",
  EDUCATION = "education",
  OTHER = "other",
}

export interface Expense {
  _id: string;
  userId: string;
  amount: number;
  category: ExpenseCategory | string;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUser extends User {}

export interface IExpense extends Expense {}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
}

export interface AuthResponse {
  user: Omit<User, "password">;
  token?: string;
}

export interface CategoryTotal {
  category: ExpenseCategory;
  total: number;
  count: number;
  percentage: number;
}

export interface MonthlyTotals {
  month: string;
  total: number;
  count: number;
}

export interface DashboardStats {
  totalExpenses: number;
  expenseCount: number;
  roundedAverageExpenseAmount: number;
  highestExpense: IExpense;
  lowestExpense: IExpense;
  currentMonthTotal: number;
  lastMonthTotal: number;
  monthlyChange: number;
}
