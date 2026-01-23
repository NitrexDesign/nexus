import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle>;
let pool: mysql.Pool;

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  maxRetries?: number;
  retryDelay?: number;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectMySQL(config: DatabaseConfig): Promise<typeof db> {
  const maxRetries = config.maxRetries || 30;
  const retryDelay = config.retryDelay || 5000;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[MySQL] Connection attempt ${attempt}/${maxRetries}...`);

      pool = mysql.createPool({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectionLimit: 25,
        waitForConnections: true,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      });

      // Test connection
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();

      db = drizzle(pool, { schema, mode: "default" });

      console.log(
        `[MySQL] Connected successfully to ${config.host}:${config.port}/${config.database}`,
      );
      return db;
    } catch (error) {
      lastError = error as Error;
      console.error(`[MySQL] Connection attempt ${attempt} failed:`, error);

      if (attempt < maxRetries) {
        console.log(`[MySQL] Retrying in ${retryDelay / 1000}s...`);
        await sleep(retryDelay);
      }
    }
  }

  throw new Error(
    `Failed to connect to MySQL after ${maxRetries} attempts: ${lastError?.message}`,
  );
}

export function getDB(): typeof db {
  if (!db) {
    throw new Error("Database not initialized. Call connectMySQL first.");
  }
  return db;
}

export function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error("Database pool not initialized. Call connectMySQL first.");
  }
  return pool;
}

export async function closeMySQL(): Promise<void> {
  if (pool) {
    await pool.end();
    console.log("[MySQL] Connection pool closed");
  }
}
