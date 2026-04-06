import express, { Application } from "express";
import cors from "cors";
import expenseRoutes from "./routes/expenseRoutes";
import authRoutes from "./routes/authRoutes";
import profileRoutes from "./routes/profileRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import { errorHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";
import { requestTiming } from "./middleware/requestTiming";

export const createApp = (): Application => {
  const app = express();

  const corsOptions = {
    origin: "http://localhost:3000",
    credentials: true,
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(requestTiming);

  app.get("/", (req, res) => {
    res.send("Hello from TS + Express");
  });

  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "OK",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use("/api/expenses", expenseRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/profile", profileRoutes);
  app.use("/api/analytics", analyticsRoutes);

  app.use((req, res) => {
    logger.warn("Route not found", {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    });

    res.status(404).json({
      success: false,
      error: `Cannot Find ${req.method} ${req.originalUrl}`,
    });
  });

  app.use(errorHandler);

  return app;
};
