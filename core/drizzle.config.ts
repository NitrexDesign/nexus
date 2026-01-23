import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306"),
    user: process.env.DB_USER || "nexus",
    password: process.env.DB_PASSWORD || "nexus_password",
    database: process.env.DB_NAME || "nexus",
  },
} satisfies Config;
