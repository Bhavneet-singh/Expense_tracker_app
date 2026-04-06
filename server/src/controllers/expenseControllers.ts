import { NextFunction, Request, Response } from "express";
import { ExpenseCategory } from "../types";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers";
import { AppError } from "../middleware/errorHandler";
import {
  createExpense as insertExpense,
  deleteExpenseById,
  findExpenseByIdForUser,
  listExpensesByUserId,
  updateExpenseById,
} from "../models/Expense";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const parsePagination = (req: Request) => {
  // Hard caps protect the database from accidental large scans and keep latency predictable.
  const rawLimit = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
  const rawOffset = req.query.offset ? Number(req.query.offset) : 0;

  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > MAX_LIMIT) {
    throw new AppError(`Limit must be an integer between 1 and ${MAX_LIMIT}`, 400);
  }

  if (!Number.isInteger(rawOffset) || rawOffset < 0) {
    throw new AppError("Offset must be an integer greater than or equal to 0", 400);
  }

  return {
    limit: rawLimit,
    offset: rawOffset,
  };
};

export const getAllExpenses = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const { category, sort } = req.query;
    const { limit, offset } = parsePagination(req);

    const { expenses, total } = await listExpensesByUserId(userId, {
      category: typeof category === "string" ? category : undefined,
      sort: typeof sort === "string" ? sort : undefined,
      limit,
      offset,
    });

    sendSuccess(res, expenses, `Found ${expenses.length} expenses.`, 200, {
      limit,
      offset,
      total,
      hasMore: offset + expenses.length < total,
    });
  },
);

export const getExpenseById = asyncHandler(
  async (req: Request, res: Response, nex: NextFunction) => {
    const userId = req.userId;
    const id = String(req.params.id);
    const expense = await findExpenseByIdForUser(id, userId);

    if (!expense) {
      throw new AppError("Expense Not Found", 404);
    }

    sendSuccess(res, expense, "Expense retrieved successfully");
  },
);

export const createExpense = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const { amount, category, description, date } = req.body;

    if (!amount) {
      throw new AppError("Amount is required", 400);
    }
    if (!category) {
      throw new AppError("Category is required", 400);
    }
    if (!description) {
      throw new AppError("Description is required", 400);
    }

    if (typeof amount !== "number") {
      throw new AppError("Amount must be a number", 400);
    }

    if (amount <= 0) {
      throw new AppError("Amount must be greater than 0", 400);
    }

    if (amount > 1000000) {
      throw new AppError("Amount cannot exceed 1,000,000", 400);
    }

    const validCategories = Object.values(ExpenseCategory);
    if (!validCategories.includes(category)) {
      throw new AppError(
        `Invalid category. Must be on of: ${validCategories.join(", ")}`,
        400,
      );
    }

    if (description.length < 3) {
      throw new AppError("Description must be at least 3 characters", 400);
    }
    if (description.length > 100) {
      throw new AppError("Description cannot exceed 100 characters", 400);
    }

    const expenseDate = date ? new Date(date) : new Date();
    const today = new Date();

    if (expenseDate > today) {
      throw new AppError("Cannot create an expense for a future date", 400);
    }

    const createdExpense = await insertExpense({
      userId,
      amount,
      category,
      description,
      date: expenseDate,
    });

    sendSuccess(res, createdExpense, "Expense created successfully!", 201);
  },
);

export const updateExpense = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const id = String(req.params.id);
    const { amount, category, description, date } = req.body;

    const expense = await findExpenseByIdForUser(id, userId);

    if (!expense) {
      throw new AppError("Expense Not Found", 404);
    }

    if (amount !== undefined) {
      if (typeof amount !== "number") {
        throw new AppError("Amount must be a number", 400);
      }

      if (amount <= 0) {
        throw new AppError("Amount must be greater than 0", 400);
      }

      if (amount > 1000000) {
        throw new AppError("Amount cannot exceed 1,000,000", 400);
      }
    }

    if (category !== undefined) {
      const validCategories = Object.values(ExpenseCategory);
      if (!validCategories.includes(category)) {
        throw new AppError(
          `Invalid category. Must be one of: ${validCategories.join(", ")}`,
          400,
        );
      }
    }

    if (description !== undefined) {
      if (description.length < 3) {
        throw new AppError("Description must be at least 3 characters", 400);
      }
      if (description.length > 100) {
        throw new AppError("Description cannot exceed 100 characters", 400);
      }
    }

    if (date !== undefined) {
      const expenseDate = new Date(date);
      if (expenseDate > new Date()) {
        throw new AppError("Cannot update an expense to a future date", 400);
      }
    }

    const updatedExpense = await updateExpenseById(id, userId, {
      amount,
      category,
      description,
      date: date !== undefined ? new Date(date) : undefined,
    });

    if (!updatedExpense) {
      throw new AppError("Expense Not Found", 404);
    }

    sendSuccess(res, updatedExpense, "Expense updated successfully!");
  },
);

export const deleteExpense = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const id = String(req.params.id);
    const deleted = await deleteExpenseById(id, userId);

    if (!deleted) {
      throw new AppError("Expense Not Found", 404);
    }

    sendSuccess(res, null, "Expense deleted successfully!");
  },
);
