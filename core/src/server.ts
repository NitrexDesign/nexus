import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serveStatic } from "hono/bun";
import * as path from "path";
import { config } from "./config";
import { connectMySQL, closeMySQL } from "./db/mysql";
import { connectClickHouse, closeClickHouse } from "./db/clickhouse";
import { startHealthChecker, stopHealthChecker } from "./health/checker";
import { initWebAuthn } from "./auth/webauthn";
import { initAuthHandlers } from "./auth/handlers";
import * as authHandlers from "./auth/handlers";
import * as serviceHandlers from "./api/services";
import * as iconHandlers from "./api/icons";
import * as userHandlers from "./api/users";
// Widgets API removed

const app = new Hono();

// Middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    credentials: true,
  }),
);

// Health check endpoint
app.get("/health", (c) => c.text("OK"));

// Auth routes
app.post("/api/auth/register/password", authHandlers.registerPassword);
app.post("/api/auth/login/password", authHandlers.loginPassword);
app.get(
  "/api/auth/register/webauthn/start",
  authHandlers.startWebAuthnRegistration,
);
app.post(
  "/api/auth/register/webauthn/finish",
  authHandlers.finishWebAuthnRegistration,
);
app.get("/api/auth/login/webauthn/start", authHandlers.startWebAuthnLogin);
app.post("/api/auth/login/webauthn/finish", authHandlers.finishWebAuthnLogin);

// Service routes
app.get("/api/services", serviceHandlers.getServices);
app.post("/api/services", serviceHandlers.createService);
app.put("/api/services/:id", serviceHandlers.updateService);
app.delete("/api/services/:id", serviceHandlers.deleteService);
app.post("/api/services/import", serviceHandlers.importServices);
app.post("/api/services/bulk", serviceHandlers.importServices); // Alias for import
app.get("/api/services/groups", serviceHandlers.getServiceGroups);
app.get("/api/services/:id/uptime", serviceHandlers.getServiceUptime);
app.get("/api/services/uptime", serviceHandlers.getAllServicesUptime);

// Icon routes
app.get("/api/icons/search", iconHandlers.searchIcons);
app.post("/api/icons/download", iconHandlers.downloadIcon);
app.post("/api/icons/upload", iconHandlers.uploadIcon);

// User routes
app.get("/api/users", userHandlers.getUsers);
app.put("/api/users/:id/approve", userHandlers.approveUser);
app.delete("/api/users/:id", userHandlers.deleteUser);

// Widget API removed

// Serve icons from data/icons directory
const iconsPath = path.resolve(process.cwd(), config.iconsDir);
app.use(
  "/icons/*",
  serveStatic({
    root: iconsPath,
    rewriteRequestPath: (p) => p.replace(/^\/icons/, ""),
  }),
);

// Serve static files from web/dist
const webDistPath = path.resolve(process.cwd(), config.webDistDir);
app.use("/*", serveStatic({ root: webDistPath }));

// SPA fallback - serve index.html for all unmatched routes
app.get("*", async (c) => {
  const indexPath = path.join(webDistPath, "index.html");
  try {
    const file = Bun.file(indexPath);
    const html = await file.text();
    return c.html(html);
  } catch (error) {
    console.error("[Server] Error serving index.html:", error);
    return c.text("Not found", 404);
  }
});

// Initialization and startup
async function startServer() {
  console.log("[Server] Starting Nexus TypeScript backend...");
  console.log("[Server] Configuration:", {
    apiPort: config.apiPort,
    dbHost: config.db.host,
    clickhouseHost: config.clickhouse.host || "not configured",
    webauthnRpId: config.webauthn.rpID,
  });

  try {
    // Connect to MySQL
    console.log("[Server] Connecting to MySQL...");
    await connectMySQL({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      maxRetries: config.db.maxRetries,
      retryDelay: config.db.retryDelay,
    });

    // Connect to ClickHouse (optional)
    console.log("[Server] Connecting to ClickHouse...");
    await connectClickHouse({
      host: config.clickhouse.host,
      port: config.clickhouse.port,
      database: config.clickhouse.database,
      username: config.clickhouse.username,
      password: config.clickhouse.password,
    });

    // Initialize WebAuthn
    console.log("[Server] Initializing WebAuthn...");
    const webauthnConfig = initWebAuthn({
      rpName: config.webauthn.rpName,
      rpID: config.webauthn.rpID,
      origin: config.webauthn.origin,
    });
    initAuthHandlers(webauthnConfig);

    // Start health checker
    console.log("[Server] Starting health checker...");
    startHealthChecker(config.healthCheckInterval);

    // Start HTTP server
    console.log(`[Server] Starting HTTP server on port ${config.apiPort}...`);
    const server = Bun.serve({
      port: config.apiPort,
      fetch: app.fetch,
    });

    console.log(
      `[Server] ✓ Nexus backend running at http://localhost:${server.port}`,
    );
    console.log("[Server] Press Ctrl+C to stop");

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\n[Server] Shutting down gracefully...");

      stopHealthChecker();
      await closeClickHouse();
      await closeMySQL();

      console.log("[Server] Shutdown complete");
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("\n[Server] Received SIGTERM, shutting down...");

      stopHealthChecker();
      await closeClickHouse();
      await closeMySQL();

      console.log("[Server] Shutdown complete");
      process.exit(0);
    });
  } catch (error) {
    console.error("[Server] Fatal error during startup:", error);
    process.exit(1);
  }
}

// Start the server
startServer();
