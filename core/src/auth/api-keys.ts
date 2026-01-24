import { Context, Next } from "hono";
import * as crypto from "crypto";
import * as bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { embedConfigs, users } from "../db/schema";

const SALT_ROUNDS = 10;
const API_KEY_PREFIX = "nx_";

/**
 * Generate a new API key with the format: nx_<random_32_chars>
 */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(24);
  const key = randomBytes.toString("base64url");
  return `${API_KEY_PREFIX}${key}`;
}

/**
 * Hash an API key for secure storage
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, SALT_ROUNDS);
}

/**
 * Verify an API key against its hash
 */
export async function verifyApiKey(
  apiKey: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
}

/**
 * Middleware to validate API key for embed endpoints
 * Checks for API key in Authorization header (Bearer token) or query parameter
 */
export async function validateEmbedApiKey(c: Context, next: Next) {
  try {
    // Extract API key from Authorization header or query param
    const authHeader = c.req.header("Authorization");
    const queryApiKey = c.req.query("apiKey");

    let apiKey: string | null = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      apiKey = authHeader.substring(7);
    } else if (queryApiKey) {
      apiKey = queryApiKey;
    }

    if (!apiKey) {
      return c.json({ error: "API key required" }, 401);
    }

    // Validate API key format
    if (!apiKey.startsWith(API_KEY_PREFIX)) {
      return c.json({ error: "Invalid API key format" }, 401);
    }

    // Look up embed config by API key
    const db = getDB();
    const configs = await db
      .select()
      .from(embedConfigs)
      .where(eq(embedConfigs.apiKey, apiKey));

    if (configs.length === 0) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    const config = configs[0];

    // Verify the API key hash
    const isValid = await verifyApiKey(apiKey, config.apiKeyHash);
    if (!isValid) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    // Check allowed origins if configured
    const origin = c.req.header("Origin") || c.req.header("Referer") || "";
    if (config.allowedOrigins && config.allowedOrigins.length > 0 && origin) {
      const isOriginAllowed = config.allowedOrigins.some((allowed) => {
        if (allowed === "*") return true;
        if (allowed.includes("*")) {
          // Simple wildcard matching: *.example.com
          const pattern = allowed.replace(/\*/g, ".*");
          return new RegExp(`^${pattern}$`).test(origin);
        }
        return origin.startsWith(allowed);
      });

      if (!isOriginAllowed) {
        return c.json({ error: "Origin not allowed" }, 403);
      }
    }

    // Store embed config in context for use by handler
    c.set("embedConfig", config);

    await next();
  } catch (error: unknown) {
    console.error("[API Keys] Error validating API key:", error);
    return c.json({ error: "Authentication failed" }, 500);
  }
}

/**
 * Middleware to validate user is admin (for managing embed configs)
 */
export async function requireAdmin(c: Context, next: Next) {
  try {
    // TODO: Implement proper session-based auth check
    // For now, checking if user header is present (simplified)
    const userId = c.req.header("X-User-Id");

    if (!userId) {
      return c.json({ error: "Authentication required" }, 401);
    }

    const db = getDB();
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (userResults.length === 0 || !userResults[0].approved) {
      return c.json({ error: "Unauthorized" }, 403);
    }

    c.set("userId", userId);
    await next();
  } catch (error: unknown) {
    console.error("[API Keys] Error checking admin:", error);
    return c.json({ error: "Authorization failed" }, 500);
  }
}
