import jwt from "jsonwebtoken";
import { logger } from "./logger.js";

export const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables");
  }

  const payload = { userId };

  const token = jwt.sign(payload, secret, { expiresIn: "2d" });
  logger.info("JWT token created", { userId });

  return token;
};
