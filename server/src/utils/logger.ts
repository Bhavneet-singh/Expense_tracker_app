import { Request } from "express";

type LogLevel = "INFO" | "WARN" | "ERROR";
type LogMeta = Record<string, unknown>;

const formatMeta = (meta?: LogMeta) => {
  if (!meta || Object.keys(meta).length === 0) {
    return "";
  }

  return ` ${JSON.stringify(meta)}`;
};

const writeLog = (level: LogLevel, message: string, meta?: LogMeta) => {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}${formatMeta(meta)}`;

  if (level === "ERROR") {
    console.error(logLine);
    return;
  }

  if (level === "WARN") {
    console.warn(logLine);
    return;
  }

  console.log(logLine);
};

const getErrorMeta = (error: unknown) => {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
    };
  }

  return { error };
};

export const logger = {
  info: (message: string, meta?: LogMeta) => writeLog("INFO", message, meta),
  warn: (message: string, meta?: LogMeta) => writeLog("WARN", message, meta),
  error: (message: string, meta?: LogMeta) => writeLog("ERROR", message, meta),
  requestError: (message: string, req: Request, error: unknown, meta?: LogMeta) =>
    writeLog("ERROR", message, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.userId ?? null,
      ...getErrorMeta(error),
      ...meta,
    }),
};
