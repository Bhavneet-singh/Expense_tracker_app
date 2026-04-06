import { NextFunction, Request, Response } from "express";
import { ApiResponse, PaginationMeta } from "../types";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = "success",
  statusCode: number = 200,
  meta?: PaginationMeta,
) => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
    ...(meta ? { meta } : {}),
  };

  res.status(statusCode).json(response);
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
