import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

const mockCreateExpense = jest.fn();
const mockDeleteExpenseById = jest.fn();
const mockFindExpenseByIdForUser = jest.fn();
const mockFindExpenseById = jest.fn();
const mockListExpensesByUserId = jest.fn();
const mockUpdateExpenseById = jest.fn();

jest.unstable_mockModule("../utils/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    requestError: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/Expense.js", () => ({
  createExpense: mockCreateExpense,
  deleteExpenseById: mockDeleteExpenseById,
  deleteExpensesByUserId: jest.fn(),
  findExpenseById: mockFindExpenseById,
  findExpenseByIdForUser: mockFindExpenseByIdForUser,
  listExpensesByUserId: mockListExpensesByUserId,
  updateExpenseById: mockUpdateExpenseById,
}));

jest.unstable_mockModule("../routes/profileRoutes.js", () => ({
  default: express.Router(),
}));

jest.unstable_mockModule("../routes/analyticsRoutes.js", () => ({
  default: express.Router(),
}));

const { createApp } = await import("../app.js");

const authHeader = {
  Authorization: `Bearer ${jwt.sign({ userId: "1" }, process.env.JWT_SECRET!)}`,
};

describe("Expense routes", () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks unauthorized requests", async () => {
    const response = await request(app).get("/api/expenses");

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("returns paginated expenses with filters", async () => {
    mockListExpensesByUserId.mockResolvedValue({
      expenses: [
        {
          _id: "10",
          userId: "1",
          amount: 25,
          category: "food",
          description: "Lunch",
          date: new Date("2026-04-05T00:00:00.000Z"),
          createdAt: new Date("2026-04-05T00:00:00.000Z"),
          updatedAt: new Date("2026-04-05T00:00:00.000Z"),
        },
      ],
      total: 3,
    });

    const response = await request(app)
      .get("/api/expenses?category=food&sort=-date&limit=1&offset=1")
      .set(authHeader);

    expect(response.status).toBe(200);
    expect(mockListExpensesByUserId).toHaveBeenCalledWith("1", {
      category: "food",
      sort: "-date",
      limit: 1,
      offset: 1,
    });
    expect(response.body.meta).toEqual({
      limit: 1,
      offset: 1,
      total: 3,
      hasMore: true,
    });
  });

  it("returns empty results cleanly", async () => {
    mockListExpensesByUserId.mockResolvedValue({
      expenses: [],
      total: 0,
    });

    const response = await request(app).get("/api/expenses").set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(0);
  });

  it("rejects invalid pagination input", async () => {
    const response = await request(app)
      .get("/api/expenses?limit=1000&offset=-1")
      .set(authHeader);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("creates an expense", async () => {
    mockCreateExpense.mockResolvedValue({
      _id: "11",
      userId: "1",
      amount: 55.25,
      category: "food",
      description: "Dinner",
      date: new Date("2026-04-05T00:00:00.000Z"),
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      updatedAt: new Date("2026-04-05T00:00:00.000Z"),
    });

    const response = await request(app).post("/api/expenses").set(authHeader).send({
      amount: 55.25,
      category: "food",
      description: "Dinner",
      date: "2026-04-05T00:00:00.000Z",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.description).toBe("Dinner");
  });

  it("rejects invalid expense payloads", async () => {
    const response = await request(app).post("/api/expenses").set(authHeader).send({
      amount: -5,
      category: "food",
      description: "x",
      date: "2026-04-05T00:00:00.000Z",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("gets an expense by id", async () => {
    mockFindExpenseByIdForUser.mockResolvedValue({
      _id: "10",
      userId: "1",
      amount: 25,
      category: "food",
      description: "Lunch",
      date: new Date("2026-04-05T00:00:00.000Z"),
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      updatedAt: new Date("2026-04-05T00:00:00.000Z"),
    });

    const response = await request(app).get("/api/expenses/10").set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data._id).toBe("10");
  });

  it("updates an expense", async () => {
    mockFindExpenseByIdForUser.mockResolvedValue({
      _id: "10",
      userId: "1",
      amount: 25,
      category: "food",
      description: "Lunch",
      date: new Date("2026-04-05T00:00:00.000Z"),
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      updatedAt: new Date("2026-04-05T00:00:00.000Z"),
    });
    mockUpdateExpenseById.mockResolvedValue({
      _id: "10",
      userId: "1",
      amount: 30,
      category: "food",
      description: "Updated lunch",
      date: new Date("2026-04-05T00:00:00.000Z"),
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      updatedAt: new Date("2026-04-05T01:00:00.000Z"),
    });

    const response = await request(app).post("/api/expenses/10").set(authHeader).send({
      amount: 30,
      category: "food",
      description: "Updated lunch",
      date: "2026-04-05T00:00:00.000Z",
    });

    expect(response.status).toBe(200);
    expect(mockUpdateExpenseById).toHaveBeenCalledWith("10", "1", {
      amount: 30,
      category: "food",
      description: "Updated lunch",
      date: new Date("2026-04-05T00:00:00.000Z"),
    });
  });

  it("deletes an expense", async () => {
    mockDeleteExpenseById.mockResolvedValue(true);

    const response = await request(app).delete("/api/expenses/10").set(authHeader);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("returns 404 when deleting a missing expense", async () => {
    mockDeleteExpenseById.mockResolvedValue(false);

    const response = await request(app).delete("/api/expenses/404").set(authHeader);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });
});
