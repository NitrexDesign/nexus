import { Context, Next } from "hono";
import { eq } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { users } from "../db/schema";

/**
 * Middleware to validate user is admin
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
