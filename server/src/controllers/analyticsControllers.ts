import { NextFunction, Request, Response } from "express";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers";
import { AppError } from "../middleware/errorHandler";
import { DashboardStats, Expense, MonthlyTotals } from "../types";
import { findUserById } from "../models/User";
import { query } from "../config/db";

const getMonthString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${month}-${year}`;
};

type ExpenseRow = {
  id: number;
  user_id: number;
  amount: string | number;
  category: string;
  description: string;
  date: Date;
  created_at: Date;
  updated_at: Date;
};

const mapExpense = (row: ExpenseRow): Expense => ({
  _id: String(row.id),
  userId: String(row.user_id),
  amount: Number(row.amount),
  category: row.category,
  description: row.description,
  date: new Date(row.date),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

const ensureUser = async (userId: string) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }
};

export const getExpensesByCategories = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await ensureUser(req.userId);

    const result = await query<{
      category: string;
      total: string | number;
      count: string | number;
      percentage: string | number;
    }>(
      `SELECT
         category,
         ROUND(SUM(amount)::numeric, 2) AS total,
         COUNT(*)::int AS count,
         ROUND((SUM(amount) / NULLIF(SUM(SUM(amount)) OVER (), 0) * 100)::numeric, 1) AS percentage
       FROM expenses
       WHERE user_id = $1
       GROUP BY category
       ORDER BY SUM(amount) DESC`,
      [Number(req.userId)],
    );

    if (result.rows.length === 0) {
      sendSuccess(
        res,
        [],
        "No expenses found. Create an expense to get started.",
      );
      return;
    }

    const data = result.rows.map((row) => ({
      category: row.category,
      total: Number(row.total),
      count: Number(row.count),
      percentage: Number(row.percentage),
    }));

    sendSuccess(res, data, "Category breakdown retrieved!");
  },
);

export const getDashboardStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await ensureUser(req.userId);

    const statsResult = await query<{
      total_expenses: string | number;
      expense_count: string | number;
      rounded_average_expense_amount: string | number;
      current_month_total: string | number;
      last_month_total: string | number;
    }>(
      `SELECT
         COALESCE(ROUND(SUM(amount)::numeric, 2), 0) AS total_expenses,
         COUNT(*)::int AS expense_count,
         COALESCE(ROUND(AVG(amount)::numeric, 1), 0) AS rounded_average_expense_amount,
         COALESCE(
           ROUND(
             SUM(CASE
               WHEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
               THEN amount ELSE 0
             END)::numeric,
             2
           ),
           0
         ) AS current_month_total,
         COALESCE(
           ROUND(
             SUM(CASE
               WHEN DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
               THEN amount ELSE 0
             END)::numeric,
             2
           ),
           0
         ) AS last_month_total
       FROM expenses
       WHERE user_id = $1`,
      [Number(req.userId)],
    );

    const summary = statsResult.rows[0];

    if (!summary || Number(summary.expense_count) === 0) {
      sendSuccess(
        res,
        [],
        "No expenses found. Create an expense to get started.",
      );
      return;
    }

    const extremes = await query<ExpenseRow>(
      `(
         SELECT id, user_id, amount, category, description, date, created_at, updated_at
         FROM expenses
         WHERE user_id = $1
         ORDER BY amount DESC, date DESC
         LIMIT 1
       )
       UNION ALL
       (
         SELECT id, user_id, amount, category, description, date, created_at, updated_at
         FROM expenses
         WHERE user_id = $1
         ORDER BY amount ASC, date DESC
         LIMIT 1
       )`,
      [Number(req.userId)],
    );

    const highestExpense = mapExpense(extremes.rows[0]);
    const lowestExpense = mapExpense(extremes.rows[1] ?? extremes.rows[0]);
    const currentMonthTotal = Number(summary.current_month_total);
    const lastMonthTotal = Number(summary.last_month_total);

    let monthlyChange = 0;

    if (lastMonthTotal > 0) {
      monthlyChange = ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
      monthlyChange = Math.round(monthlyChange * 10) / 10;
    } else if (currentMonthTotal > 0) {
      monthlyChange = 100;
    }

    const stats: DashboardStats = {
      totalExpenses: Number(summary.total_expenses),
      expenseCount: Number(summary.expense_count),
      roundedAverageExpenseAmount: Number(summary.rounded_average_expense_amount),
      highestExpense,
      lowestExpense,
      currentMonthTotal,
      lastMonthTotal,
      monthlyChange,
    };

    sendSuccess(res, stats, "Dashbaord statistics rerieved.");
  },
);

export const getSpendingTrends = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await ensureUser(req.userId);

    const result = await query<{
      month_date: Date;
      total: string | number;
      count: string | number;
    }>(
      `WITH months AS (
         SELECT generate_series(
           DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months',
           DATE_TRUNC('month', CURRENT_DATE),
           INTERVAL '1 month'
         ) AS month_date
       )
       SELECT
         months.month_date,
         COALESCE(ROUND(SUM(expenses.amount)::numeric, 2), 0) AS total,
         COUNT(expenses.id)::int AS count
       FROM months
       LEFT JOIN expenses
         ON DATE_TRUNC('month', expenses.date) = months.month_date
        AND expenses.user_id = $1
       GROUP BY months.month_date
       ORDER BY months.month_date ASC`,
      [Number(req.userId)],
    );

    const hasExpenses = result.rows.some((row) => Number(row.count) > 0);

    if (!hasExpenses) {
      sendSuccess(
        res,
        [],
        "No expenses found. Create an expense to get started.",
      );
      return;
    }

    const trends = result.rows.map((row) => ({
      month: getMonthString(new Date(row.month_date)),
      total: Number(row.total),
      count: Number(row.count),
    }));

    sendSuccess(res, trends, "Spending trends retrieved.");
  },
);

export const getPeriodStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await ensureUser(req.userId);

    const days = Number(req.query.days);

    if (isNaN(days)) {
      throw new AppError("Days must be a valid number", 400);
    }

    if (days < 1 || days > 365) {
      throw new AppError("Days must be between 1 and 365", 400);
    }

    const result = await query<{
      category: string;
      total: string | number;
      count: string | number;
      percentage: string | number;
    }>(
      `SELECT
         category,
         ROUND(SUM(amount)::numeric, 2) AS total,
         COUNT(*)::int AS count,
         ROUND((SUM(amount) / NULLIF(SUM(SUM(amount)) OVER (), 0) * 100)::numeric, 1) AS percentage
       FROM expenses
       WHERE user_id = $1
         AND date >= DATE_TRUNC('day', CURRENT_TIMESTAMP) - (($2::int) * INTERVAL '1 day')
         AND date <= CURRENT_TIMESTAMP
       GROUP BY category
       ORDER BY SUM(amount) DESC`,
      [Number(req.userId), days],
    );

    if (result.rows.length === 0) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      return sendSuccess(
        res,
        {
          total: 0,
          count: 0,
          average: 0,
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
        },
        `No expenses found for last ${days} days`,
      );
    }

    const data = result.rows.map((row) => ({
      category: row.category,
      total: Number(row.total),
      count: Number(row.count),
      percentage: Number(row.percentage),
    }));

    sendSuccess(res, data, `Last ${days} days spending retrieved`);
  },
);

export const getMonthlyTotals = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await ensureUser(req.userId);

    const year = req.query.year
      ? Number(req.query.year)
      : new Date().getFullYear();

    if (isNaN(year)) {
      throw new AppError("Year must be a valid number", 400);
    }

    const currentYear = new Date().getFullYear();
    if (year < 2000 || year > currentYear + 1) {
      throw new AppError(
        `Year must be between 2000 and ${currentYear + 1}`,
        400,
      );
    }

    const result = await query<{
      month_date: Date;
      total: string | number;
      count: string | number;
    }>(
      `SELECT
         DATE_TRUNC('month', date) AS month_date,
         ROUND(SUM(amount)::numeric, 2) AS total,
         COUNT(*)::int AS count
       FROM expenses
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM date) = $2
       GROUP BY DATE_TRUNC('month', date)
       ORDER BY DATE_TRUNC('month', date) ASC`,
      [Number(req.userId), year],
    );

    if (result.rows.length === 0) {
      sendSuccess(res, [], `No expenses found for ${year}`);
      return;
    }

    const monthlyArray: MonthlyTotals[] = result.rows.map((row) => ({
      month: getMonthString(new Date(row.month_date)),
      total: Number(row.total),
      count: Number(row.count),
    }));

    sendSuccess(res, monthlyArray, `Monthly total for ${year} retrieved.`);
  },
);

export const getCurrentMonthExpenses = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await ensureUser(req.userId);

    const result = await query<{
      category: string;
      total: string | number;
      count: string | number;
      percentage: string | number;
    }>(
      `SELECT
         category,
         ROUND(SUM(amount)::numeric, 2) AS total,
         COUNT(*)::int AS count,
         ROUND((SUM(amount) / NULLIF(SUM(SUM(amount)) OVER (), 0) * 100)::numeric, 1) AS percentage
       FROM expenses
       WHERE user_id = $1
         AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
       GROUP BY category
       ORDER BY SUM(amount) DESC`,
      [Number(req.userId)],
    );

    if (result.rows.length === 0) {
      return sendSuccess(res, [], "No expenses found for current month");
    }

    const currentMonth = getMonthString(new Date());
    const data = result.rows.map((row) => ({
      category: row.category,
      total: Number(row.total),
      count: Number(row.count),
      percentage: Number(row.percentage),
    }));

    sendSuccess(
      res,
      data,
      `Current month ${currentMonth} category breakdown retrieved`,
    );
  },
);

export const getYearlyCategoryStats = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await ensureUser(req.userId);

    const currentYear = new Date().getFullYear();
    const year = req.query.year ? Number(req.query.year) : currentYear;

    if (isNaN(year)) {
      throw new AppError("Year must be a valid number", 400);
    }

    if (year < 2000 || year > currentYear + 1) {
      throw new AppError(
        `Year must be between 2000 and ${currentYear + 1}`,
        400,
      );
    }

    const result = await query<{
      month_date: Date;
      category: string;
      total: string | number;
      count: string | number;
    }>(
      `SELECT
         DATE_TRUNC('month', date) AS month_date,
         category,
         ROUND(SUM(amount)::numeric, 2) AS total,
         COUNT(*)::int AS count
       FROM expenses
       WHERE user_id = $1
         AND EXTRACT(YEAR FROM date) = $2
       GROUP BY DATE_TRUNC('month', date), category
       ORDER BY DATE_TRUNC('month', date) ASC, category ASC`,
      [Number(req.userId), year],
    );

    if (result.rows.length === 0) {
      return sendSuccess(res, [], `No expenses found for the year ${year}`);
    }

    const monthlyData = new Map<
      string,
      { month: string; total: number; categories: Array<{ category: string; total: number; count: number }> }
    >();

    result.rows.forEach((row) => {
      const month = getMonthString(new Date(row.month_date));
      const total = Number(row.total);
      const count = Number(row.count);

      if (!monthlyData.has(month)) {
        monthlyData.set(month, {
          month,
          total: 0,
          categories: [],
        });
      }

      const entry = monthlyData.get(month)!;
      entry.total += total;
      entry.categories.push({
        category: row.category,
        total,
        count,
      });
    });

    const data = Array.from(monthlyData.values()).map((entry) => ({
      month: entry.month,
      total: Math.round(entry.total * 100) / 100,
      categories: entry.categories,
    }));

    sendSuccess(res, data, `Yearly category breakdown for the year ${year}`);
  },
);

export const getAllYears = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await ensureUser(req.userId);

    const result = await query<{
      year: string | number;
      total: string | number;
      count: string | number;
    }>(
      `SELECT
         EXTRACT(YEAR FROM date)::int AS year,
         ROUND(SUM(amount)::numeric, 2) AS total,
         COUNT(*)::int AS count
       FROM expenses
       WHERE user_id = $1
       GROUP BY EXTRACT(YEAR FROM date)
       ORDER BY year DESC`,
      [Number(req.userId)],
    );

    if (result.rows.length === 0) {
      return sendSuccess(res, [], "No expenses found for this user");
    }

    const data = result.rows.map((row) => ({
      year: Number(row.year),
      total: Number(row.total),
      count: Number(row.count),
    }));

    sendSuccess(res, data, "All years spending retrieved");
  },
);
