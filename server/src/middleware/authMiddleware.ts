import { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    throw new AppError("No token provided. Please login.", 401);
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    throw new AppError("Invalid token format. Use: Bearer <token>", 401);
  }

  const token = parts[1];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    logger.error("JWT secret is missing during auth middleware execution", {
      method: req.method,
      url: req.originalUrl,
    });
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  try {
    const decoded = jwt.verify(token, secret) as { userId: string };

    req.userId = decoded.userId;
    next();
  } catch (error) {
    logger.requestError("Authentication token verification failed", req, error);
    throw error;
  }
};
