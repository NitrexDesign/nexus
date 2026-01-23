#!/usr/bin/env bun
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import "dotenv/config";

const config = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "nexus",
  password: process.env.DB_PASSWORD || "nexus_password",
  database: process.env.DB_NAME || "nexus",
  multipleStatements: true,
};

async function runMigrations() {
  console.log("🔄 Connecting to database...");
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Database: ${config.database}`);

  let connection: mysql.Connection | undefined;

  try {
    connection = await mysql.createConnection(config);
    const db = drizzle(connection);

    console.log("🚀 Running migrations...");
    await migrate(db, { migrationsFolder: "./drizzle" });

    console.log("✅ Migrations completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations();
