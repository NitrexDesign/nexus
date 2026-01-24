import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { embedConfigs, services } from "../db/schema";
import { runTask } from "../db/task-queue";
import { generateId } from "../utils/id";
import { generateApiKey, hashApiKey } from "../auth/api-keys";
import { getUptimeHistory } from "../db/clickhouse";

// Helper to safely get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// GET /api/embed/configs - List all embed configs (admin only)
export async function getEmbedConfigs(c: Context) {
  try {
    const userId = c.get("userId");
    const db = getDB();

    // Return all configs for this user
    const configs = await db
      .select()
      .from(embedConfigs)
      .where(eq(embedConfigs.userId, userId));

    // Don't return API key hashes to client
    const sanitized = configs.map((config) => ({
      ...config,
      apiKeyHash: undefined,
      apiKey: `${config.apiKey.substring(0, 10)}...`, // Show only prefix
    }));

    return c.json(sanitized);
  } catch (error: unknown) {
    console.error("[Embeds] Error fetching embed configs:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// POST /api/embed/configs - Create embed config (admin only)
export async function createEmbedConfig(c: Context) {
  try {
    const userId = c.get("userId");
    const body = await c.req.json();
    const {
      name,
      type,
      allowedOrigins,
      dataEndpoint,
      refreshInterval,
      settings,
      isPublic,
    } = body;

    if (!name || !type) {
      return c.json({ error: "Missing required fields: name, type" }, 400);
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    const newConfig: typeof embedConfigs.$inferInsert = {
      id: generateId(),
      name,
      type,
      apiKey,
      apiKeyHash,
      allowedOrigins: allowedOrigins || [],
      dataEndpoint: dataEndpoint || null,
      refreshInterval: refreshInterval || 60,
      settings: settings || {},
      isPublic: isPublic !== undefined ? isPublic : true,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await runTask(async () => {
      const db = getDB();
      await db.insert(embedConfigs).values(newConfig);
    });

    // Return full API key only on creation (user must save it)
    return c.json({
      ...newConfig,
      apiKeyHash: undefined,
      apiKey, // Full key shown only once
    });
  } catch (error: unknown) {
    console.error("[Embeds] Error creating embed config:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// PUT /api/embed/configs/:id - Update embed config (admin only)
export async function updateEmbedConfig(c: Context) {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");
    const body = await c.req.json();

    const {
      name,
      type,
      allowedOrigins,
      dataEndpoint,
      refreshInterval,
      settings,
      isPublic,
    } = body;

    const updates: Partial<typeof embedConfigs.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (allowedOrigins !== undefined) updates.allowedOrigins = allowedOrigins;
    if (dataEndpoint !== undefined) updates.dataEndpoint = dataEndpoint;
    if (refreshInterval !== undefined)
      updates.refreshInterval = refreshInterval;
    if (settings !== undefined) updates.settings = settings;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    await runTask(async () => {
      const db = getDB();
      await db
        .update(embedConfigs)
        .set(updates)
        .where(and(eq(embedConfigs.id, id), eq(embedConfigs.userId, userId)));
    });

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error("[Embeds] Error updating embed config:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// DELETE /api/embed/configs/:id - Delete embed config (admin only)
export async function deleteEmbedConfig(c: Context) {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    await runTask(async () => {
      const db = getDB();
      await db
        .delete(embedConfigs)
        .where(and(eq(embedConfigs.id, id), eq(embedConfigs.userId, userId)));
    });

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error("[Embeds] Error deleting embed config:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// GET /api/embed/bulk - Get all public embed data (requires API key)
export async function getBulkEmbedData(c: Context) {
  try {
    const embedConfig = c.get("embedConfig");

    if (!embedConfig || !embedConfig.isPublic) {
      return c.json({ error: "Access denied" }, 403);
    }

    const db = getDB();

    // Fetch data based on embed type
    const data: Record<string, unknown> = {
      embedId: embedConfig.id,
      type: embedConfig.type,
      settings: embedConfig.settings,
      timestamp: new Date().toISOString(),
    };

    switch (embedConfig.type) {
      case "status": {
        // Get all public services
        const publicServices = await db
          .select()
          .from(services)
          .where(eq(services.public, 1));
        data.services = publicServices;
        break;
      }

      case "uptime": {
        // Get public services with uptime data
        const publicServices = await db
          .select()
          .from(services)
          .where(eq(services.public, 1));

        // Fetch uptime for each service
        const uptimePromises = publicServices.map(async (service) => {
          try {
            const uptimeData = await getUptimeHistory(service.id);
            return {
              serviceId: service.id,
              serviceName: service.name,
              uptime: uptimeData,
            };
          } catch (error) {
            console.error(`Error fetching uptime for ${service.id}:`, error);
            return {
              serviceId: service.id,
              serviceName: service.name,
              uptime: null,
            };
          }
        });

        data.services = publicServices;
        data.uptime = await Promise.all(uptimePromises);
        break;
      }

      case "metrics": {
        // Get aggregate metrics for public services
        const publicServices = await db
          .select()
          .from(services)
          .where(eq(services.public, 1));

        const total = publicServices.length;
        const healthy = publicServices.filter(
          (s) => s.healthStatus === "up",
        ).length;
        const unhealthy = publicServices.filter(
          (s) => s.healthStatus === "down",
        ).length;
        const unknown = publicServices.filter(
          (s) => s.healthStatus === "unknown",
        ).length;

        data.metrics = {
          total,
          healthy,
          unhealthy,
          unknown,
          uptimePercentage:
            total > 0 ? ((healthy / total) * 100).toFixed(2) : "0.00",
        };
        break;
      }

      default:
        return c.json({ error: "Unknown embed type" }, 400);
    }

    return c.json(data);
  } catch (error: unknown) {
    console.error("[Embeds] Error fetching bulk embed data:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// GET /api/embed/:id/data - Get individual embed data (requires API key)
export async function getEmbedData(c: Context) {
  try {
    const embedConfig = c.get("embedConfig");
    const embedId = c.req.param("id");

    // Verify the embed ID matches the authenticated config
    if (embedConfig.id !== embedId) {
      return c.json({ error: "Embed ID mismatch" }, 403);
    }

    // Use custom data endpoint if specified
    if (embedConfig.dataEndpoint) {
      // TODO: Implement custom endpoint proxy or redirect
      return c.json({ error: "Custom endpoints not yet implemented" }, 501);
    }

    // Otherwise use bulk endpoint logic
    return getBulkEmbedData(c);
  } catch (error: unknown) {
    console.error("[Embeds] Error fetching embed data:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// POST /api/embed/configs/:id/regenerate-key - Regenerate API key (admin only)
export async function regenerateApiKey(c: Context) {
  try {
    const userId = c.get("userId");
    const id = c.req.param("id");

    // Generate new API key
    const apiKey = generateApiKey();
    const apiKeyHash = await hashApiKey(apiKey);

    await runTask(async () => {
      const db = getDB();
      await db
        .update(embedConfigs)
        .set({
          apiKey,
          apiKeyHash,
          updatedAt: new Date(),
        })
        .where(and(eq(embedConfigs.id, id), eq(embedConfigs.userId, userId)));
    });

    return c.json({ apiKey }); // Return full key only once
  } catch (error: unknown) {
    console.error("[Embeds] Error regenerating API key:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}
