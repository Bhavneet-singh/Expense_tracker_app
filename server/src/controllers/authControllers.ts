import { NextFunction, Request, Response } from "express";
import { AuthResponse } from "../types/index.js";
import { asyncHandler, sendSuccess } from "../utils/responseHelpers.js";
import { AppError } from "../middleware/errorHandler.js";
import { createUser, findUserByEmail } from "../models/User.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/tokenHelpers.js";

export const signup = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError("Please provide name, email and password", 400);
    }

    if (name && name.trim().length < 2) {
      throw new AppError("Name must be at least 2 characters.", 400);
    }

    if (name && name.trim().length > 50) {
      throw new AppError("Name cannot exceed 50 characters.", 400);
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

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      throw new AppError("Email already registered", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const savedUser = await createUser({
      name,
      email,
      password: hashedPassword,
    });
    
    const { password: _, ...userWithoutPassword } = savedUser;

    const authResponse: AuthResponse = {
      user: userWithoutPassword,
    };

    sendSuccess(res, authResponse, "Account created successfully!", 201);
  },
);

export const login = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Please provide email and password", 400);
    }

    const user = await findUserByEmail(email);

    if (!user) {
      throw new AppError("Invalid email or password", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401);
    }

    const { password: _, ...userWithoutPassword } = user;
    const token = generateToken(user._id);

    const authResponse: AuthResponse = {
      user: userWithoutPassword,
      token,
    };

    sendSuccess(res, authResponse, "Login successful");
  },
);
