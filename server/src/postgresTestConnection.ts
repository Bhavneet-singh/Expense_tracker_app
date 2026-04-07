import { pool } from "./config/db.js";

const testConnection = async () => {
  try {
    await pool.query("SELECT NOW()");
    console.log("PostgreSQL connected successfully!");
    console.log(`Database: ${process.env.PGDATABASE || "pennywise"}`);
    console.log("PostgreSQL is ready!");

    await pool.end();
    console.log("Test complete - connection closed");
  } catch (error) {
    console.error("PostgreSQL connection failed:", error);
    console.log("Make sure the PostgreSQL container is running.");
    console.log("Check DATABASE_URL or PG* variables.");
  }
};

testConnection();
