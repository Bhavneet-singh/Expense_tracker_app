import { PrismaClient } from "@prisma/client";
import { Pool, QueryResult, QueryResultRow } from "pg";
import { logger } from "../utils/logger.js";

const connectionString =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.PGUSER || "postgres"}:${
    process.env.PGPASSWORD || "postgres"
  }@${process.env.PGHOST || "postgres"}:${process.env.PGPORT || "5432"}/${
    process.env.PGDATABASE || "pennywise"
  }`;

export const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
});

export const prisma = new PrismaClient();

const createSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0 AND amount <= 1000000),
      category VARCHAR(50) NOT NULL,
      description VARCHAR(100) NOT NULL,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_expenses_user_category_created
    ON expenses(user_id, category, created_at DESC);
  `);
};

export const query = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> => {
  return pool.query<T>(text, params);
};

const connectDB = async () => {
  try {
    await pool.query("SELECT 1");
    await createSchema();
    await prisma.$connect();

    logger.info("PostgreSQL connected successfully", {
      host: process.env.PGHOST || "postgres",
      database: process.env.PGDATABASE || "pennywise",
    });
  } catch (error) {
    logger.error("PostgreSQL connection failed", {
      ...(error instanceof Error
        ? {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
          }
        : { error }),
      possibleFixes: [
        "Start the Docker database with docker compose up --build",
        "Verify DATABASE_URL or PG* environment variables",
        "Check whether the database credentials match docker-compose.yml",
      ],
    });

    process.exit(1);
  }
};

export default connectDB;
