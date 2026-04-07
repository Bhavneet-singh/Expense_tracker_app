import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  if (err.name === "ValidationError") {
    statusCode = 400;

    message = Object.values(err.errors)
      .map((e: any) => e.message)
      .join(", ");
  }

  if (err.code === 11000 || err.code === "23505") {
    statusCode = 400;
    const field =
      err?.constraint === "users_email_key"
        ? "email"
        : Object.keys(err.keyValue || {})[0] || "Record";
    message = `${field} already exists`;
  }

  if (err.name === "CastError" || err.code === "22P02") {
    statusCode = 400;
    message = err.path ? `Invalid ${err.path}: ${err.value}` : "Invalid input";
  }

  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token. Please log in again.";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Your token has expired. Please log in again.";
  }

  if (statusCode >= 500) {
    logger.requestError("Request failed with server error", req, err, {
      statusCode,
    });
  } else {
    logger.warn("Request failed", {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.userId ?? null,
      statusCode,
      errorName: err?.name,
      errorMessage: err?.message,
    });
  }

  const response: any = {
    success: false,
    error: message,
  };

  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
