import { Prisma } from "@prisma/client";
import { prisma } from "../config/db.js";
import { Expense } from "../types/index.js";

const expenseSelect = {
  id: true,
  userId: true,
  amount: true,
  category: true,
  description: true,
  date: true,
  createdAt: true,
  updatedAt: true,
} as const;

const mapExpense = (expense: {
  id: number;
  userId: number;
  amount: Prisma.Decimal | number;
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}): Expense => ({
  _id: String(expense.id),
  userId: String(expense.userId),
  amount: Number(expense.amount),
  category: expense.category,
  description: expense.description,
  date: expense.date,
  createdAt: expense.createdAt,
  updatedAt: expense.updatedAt,
});

export const findExpenseById = async (id: string): Promise<Expense | null> => {
  const expense = await prisma.expense.findUnique({
    where: { id: Number(id) },
    select: expenseSelect,
  });

  return expense ? mapExpense(expense) : null;
};

export const findExpenseByIdForUser = async (
  id: string,
  userId: string,
): Promise<Expense | null> => {
  const expense = await prisma.expense.findFirst({
    where: {
      id: Number(id),
      userId: Number(userId),
    },
    select: expenseSelect,
  });

  return expense ? mapExpense(expense) : null;
};

export const listExpensesByUserId = async (
  userId: string,
  options?: {
    category?: string;
    sort?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ expenses: Expense[]; total: number }> => {
  const orderByMap: Record<string, Prisma.ExpenseOrderByWithRelationInput> = {
    amount: { amount: "asc" },
    "-amount": { amount: "desc" },
    date: { date: "asc" },
    "-date": { date: "desc" },
  };

  const where = {
    userId: Number(userId),
    ...(options?.category ? { category: options.category } : {}),
  };

  // Fetch the current page and total count in one round trip to keep list endpoints fast.
  const [expenses, total] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      select: expenseSelect,
      orderBy: orderByMap[options?.sort || ""] || { createdAt: "desc" },
      take: options?.limit,
      skip: options?.offset,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    expenses: expenses.map(mapExpense),
    total,
  };
};

export const createExpense = async (input: {
  userId: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
}): Promise<Expense> => {
  const expense = await prisma.expense.create({
    data: {
      userId: Number(input.userId),
      amount: new Prisma.Decimal(input.amount),
      category: input.category,
      description: input.description.trim(),
      date: input.date,
    },
    select: expenseSelect,
  });

  return mapExpense(expense);
};

export const updateExpenseById = async (
  id: string,
  userId: string,
  updates: Partial<Pick<Expense, "amount" | "category" | "description" | "date">>,
): Promise<Expense | null> => {
  const currentExpense = await findExpenseByIdForUser(id, userId);

  if (!currentExpense) {
    return null;
  }

  const expense = await prisma.expense.update({
    where: { id: Number(id) },
    data: {
      amount:
        updates.amount !== undefined
          ? new Prisma.Decimal(updates.amount)
          : new Prisma.Decimal(currentExpense.amount),
      category: updates.category ?? currentExpense.category,
      description: updates.description?.trim() ?? currentExpense.description,
      date: updates.date ?? currentExpense.date,
      updatedAt: new Date(),
    },
    select: expenseSelect,
  });

  return mapExpense(expense);
};

export const deleteExpenseById = async (
  id: string,
  userId: string,
): Promise<boolean> => {
  const deleted = await prisma.expense.deleteMany({
    where: {
      id: Number(id),
      userId: Number(userId),
    },
  });

  return deleted.count > 0;
};

export const deleteExpensesByUserId = async (userId: string): Promise<void> => {
  await prisma.expense.deleteMany({
    where: { userId: Number(userId) },
  });
};
