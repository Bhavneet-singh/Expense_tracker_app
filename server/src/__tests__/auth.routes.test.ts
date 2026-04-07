import express from "express";
import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";

process.env.JWT_SECRET = "test-secret";

const mockCreateUser = jest.fn();
const mockDeleteUserById = jest.fn();
const mockFindUserByEmail = jest.fn();
const mockFindUserByEmailExcludingId = jest.fn();
const mockFindUserById = jest.fn();
const mockUpdateUser = jest.fn();

jest.unstable_mockModule("../utils/logger.js", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    requestError: jest.fn(),
  },
}));

jest.unstable_mockModule("../models/User.js", () => ({
  createUser: mockCreateUser,
  deleteUserById: mockDeleteUserById,
  findUserByEmail: mockFindUserByEmail,
  findUserByEmailExcludingId: mockFindUserByEmailExcludingId,
  findUserById: mockFindUserById,
  updateUser: mockUpdateUser,
}));

jest.unstable_mockModule("../routes/profileRoutes.js", () => ({
  default: express.Router(),
}));

jest.unstable_mockModule("../routes/analyticsRoutes.js", () => ({
  default: express.Router(),
}));

const { createApp } = await import("../app.js");

describe("Auth routes", () => {
  const app = createApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates an account with valid input", async () => {
    mockFindUserByEmail.mockResolvedValue(null);
    mockCreateUser.mockResolvedValue({
      _id: "1",
      name: "Aman",
      email: "aman@example.com",
      password: "hashed-password",
      createdAt: new Date("2026-04-06T00:00:00.000Z"),
      updatedAt: new Date("2026-04-06T00:00:00.000Z"),
    });

    const response = await request(app).post("/api/auth/signup").send({
      name: "Aman",
      email: "aman@example.com",
      password: "Strong@123",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe("aman@example.com");
    expect(response.body.data.user.password).toBeUndefined();
    expect(response.headers["x-response-time"]).toBeDefined();
  });

  it("rejects invalid signup payloads", async () => {
    const response = await request(app).post("/api/auth/signup").send({
      name: "A",
      email: "not-an-email",
      password: "weak",
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it("rejects duplicate emails", async () => {
    mockFindUserByEmail.mockResolvedValue({
      _id: "1",
      name: "Existing User",
      email: "aman@example.com",
      password: "hashed-password",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post("/api/auth/signup").send({
      name: "Aman",
      email: "aman@example.com",
      password: "Strong@123",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("Email already registered");
  });

  it("logs in with valid credentials", async () => {
    const hashedPassword = await bcrypt.hash("Strong@123", 10);

    mockFindUserByEmail.mockResolvedValue({
      _id: "1",
      name: "Aman",
      email: "aman@example.com",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "aman@example.com",
      password: "Strong@123",
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
  });

  it("rejects bad credentials", async () => {
    const hashedPassword = await bcrypt.hash("Strong@123", 10);

    mockFindUserByEmail.mockResolvedValue({
      _id: "1",
      name: "Aman",
      email: "aman@example.com",
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response = await request(app).post("/api/auth/login").send({
      email: "aman@example.com",
      password: "Wrong@123",
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });
});
