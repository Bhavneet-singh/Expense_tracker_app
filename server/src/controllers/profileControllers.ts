import { Request, Response, NextFunction } from "express";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers.js";
import { AppError } from "../middleware/errorHandler.js";
import {
  deleteUserById,
  findUserByEmailExcludingId,
  findUserById,
  updateUser,
} from "../models/User.js";
import bcrypt from "bcryptjs";
import { deleteExpensesByUserId, listExpensesByUserId } from "../models/Expense.js";

export const getProfile = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await findUserById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { password: _, ...userWithoutPassword } = user;
    sendSuccess(res, userWithoutPassword, "Profile retrieved successfully!");
  },
);

export const updateProfile = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body;
    const userId = req.userId;
    const user = await findUserById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (!name && !email && !password) {
      throw new AppError(
        "please provide name, email or password to update",
        400,
      );
    }

    if (name && name.trim().length < 2) {
      throw new AppError("Name must be at least 2 characters.", 400);
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new AppError("Invalid email format", 400);
      }
    }

    if (password) {
      if (password.length < 8) {
        throw new AppError("Password must be at least 8 characters.", 400);
      }

      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/;
      if (!passwordRegex.test(password)) {
        throw new AppError(
          "Password must contain uppercase, lowercase, number, and special character (@$!%*?&)",
          400,
        );
      }
    }

    if (email && email !== user.email) {
      const emailExists = await findUserByEmailExcludingId(email, userId);

      if (emailExists) {
        throw new AppError("Email already in use!", 400);
      }
    }

    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    const updatedUser = await updateUser(userId, {
      name,
      email,
      password: hashedPassword,
    });

    if (!updatedUser) {
      throw new AppError("User not found", 404);
    }

    const { password: _, ...userWithoutPassword } = updatedUser;
    sendSuccess(res, userWithoutPassword, "Profile updated successfully!");
  },
);

export const exportData = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await findUserById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const { expenses, total } = await listExpensesByUserId(userId, {
      limit: 10_000,
      offset: 0,
    });
    const { password: _, ...userWithoutPassword } = user;

    if (expenses.length === 0) {
      return sendSuccess(
        res,
        {
          user: userWithoutPassword,
          expenses: [],
          summary: {
            totalExpenses: 0,
            expenseCount: total,
          },
          exportedAt: new Date().toISOString(),
        },
        "Data exported successfully. You have no expenses!",
      );
    }

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const exportDataObject = {
      user: userWithoutPassword,
      expenses,
      summary: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        expenseCount: total,
      },
      exportedAt: new Date().toISOString(),
    };

    sendSuccess(res, exportDataObject, "Data exported successfully.");
  },
);

export const deleteAccount = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await findUserById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    await deleteExpensesByUserId(userId);
    await deleteUserById(userId);

    sendSuccess(
      res,
      null,
      "Account deleted successfully. All data has been removed.",
    );
  },
);
