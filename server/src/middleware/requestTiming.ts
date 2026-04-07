import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";

export const requestTiming = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const start = process.hrtime.bigint();
  const originalEnd = res.end.bind(res);

  res.end = ((chunk?: unknown, encoding?: unknown, cb?: unknown) => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    const roundedDurationMs = Math.round(durationMs * 100) / 100;

    if (!res.headersSent) {
      res.setHeader("X-Response-Time", `${roundedDurationMs}ms`);
    }

    logger.info("Request completed", {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: roundedDurationMs,
    });

    return originalEnd(chunk as never, encoding as never, cb as never);
  }) as Response["end"];

  next();
};
