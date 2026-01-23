import "dotenv/config";

export interface Config {
  // Server
  apiPort: number;

  // Database
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    maxRetries: number;
    retryDelay: number;
  };

  // ClickHouse
  clickhouse: {
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
  };

  // WebAuthn
  webauthn: {
    rpName: string;
    rpID: string;
    origin: string[];
  };

  // Health checker
  healthCheckInterval: number; // minutes

  // Paths
  iconsDir: string;
  webDistDir: string;
}

function parseOrigins(originString: string): string[] {
  return originString
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
}

export const config: Config = {
  apiPort: parseInt(process.env.API_PORT || "8080", 10),

  db: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER || "nexus",
    password: process.env.DB_PASSWORD || "nexus_password",
    database: process.env.DB_NAME || "nexus",
    maxRetries: parseInt(process.env.DB_CONNECT_RETRIES || "30", 10),
    retryDelay: parseInt(process.env.DB_CONNECT_DELAY || "5000", 10),
  },

  clickhouse: {
    host: process.env.CLICKHOUSE_HOST,
    port: process.env.CLICKHOUSE_PORT || "8123",
    database: process.env.CLICKHOUSE_DB || "nexus",
    username: process.env.CLICKHOUSE_USER || "default",
    password: process.env.CLICKHOUSE_PASSWORD || "",
  },

  webauthn: {
    rpName: process.env.WEBAUTHN_RP_NAME || "Nexus",
    rpID: process.env.WEBAUTHN_RP_ID || "localhost",
    origin: parseOrigins(
      process.env.WEBAUTHN_RP_ORIGIN ||
        "http://localhost:5173,http://localhost:8080",
    ),
  },

  healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || "5", 10),

  iconsDir: process.env.ICONS_DIR || "../data/icons",
  webDistDir: process.env.WEB_DIST_DIR || "../web/dist",
};
