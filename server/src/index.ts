import dotenv from "dotenv";
import connectDB from "./config/db";
import { logger } from "./utils/logger";
import { createApp } from "./app";

dotenv.config();

const PORT = process.env.PORT || 8000;
const app = createApp();

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info("Server is running", {
      url: `http://localhost:${PORT}`,
      portSource: process.env.PORT ? ".env file" : "default (8000)",
      environment: process.env.NODE_ENV || "development",
    });
  });
};

startServer();

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", {
    errorName: error.name,
    errorMessage: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", {
    ...(reason instanceof Error
      ? {
          errorName: reason.name,
          errorMessage: reason.message,
          stack: reason.stack,
        }
      : { reason }),
  });
});
