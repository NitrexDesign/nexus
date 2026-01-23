import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { services } from "../db/schema";
import { runTask } from "../db/task-queue";
import { generateId } from "../utils/id";
import { getUptimeHistory } from "../db/clickhouse";
import type { Service } from "../models/types";

// GET /api/services - List all services
export async function getServices(c: Context) {
  try {
    const db = getDB();
    const allServices = await db.select().from(services);
    return c.json(allServices);
  } catch (error: any) {
    console.error("[Services] Error fetching services:", error);
    return c.json({ error: error.message }, 500);
  }
}

// POST /api/services - Create service
export async function createService(c: Context) {
  try {
    const body = await c.req.json();
    const { name, url, icon, group } = body;

    if (!name || !url || !icon || !group) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    const newService: typeof services.$inferInsert = {
      id: generateId(),
      name,
      url,
      icon,
      group,
      order: body.order ?? 0,
      public: body.public ?? false,
      authRequired: body.auth_required ?? false,
      newTab: body.new_tab ?? true,
      checkHealth: body.check_health ?? false,
      healthStatus: "unknown",
      lastChecked: null,
    };

    await runTask(async () => {
      const db = getDB();
      await db.insert(services).values(newService);
    });

    return c.json(newService, 201);
  } catch (error: any) {
    console.error("[Services] Error creating service:", error);
    return c.json({ error: error.message }, 500);
  }
}

// PUT /api/services/:id - Update service
export async function updateService(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await runTask(async () => {
      const db = getDB();
      await db
        .update(services)
        .set({
          name: body.name,
          url: body.url,
          icon: body.icon,
          group: body.group,
          order: body.order,
          public: body.public,
          authRequired: body.auth_required,
          newTab: body.new_tab,
          checkHealth: body.check_health,
        })
        .where(eq(services.id, id));
    });

    return c.json({ message: "Service updated" });
  } catch (error: any) {
    console.error("[Services] Error updating service:", error);
    return c.json({ error: error.message }, 500);
  }
}

// DELETE /api/services/:id - Delete service
export async function deleteService(c: Context) {
  try {
    const id = c.req.param("id");

    await runTask(async () => {
      const db = getDB();
      await db.delete(services).where(eq(services.id, id));
    });

    return c.json({ message: "Service deleted" });
  } catch (error: any) {
    console.error("[Services] Error deleting service:", error);
    return c.json({ error: error.message }, 500);
  }
}

// POST /api/services/import - Bulk import services
export async function importServices(c: Context) {
  try {
    const body = await c.req.json();

    // Support both formats: array directly or wrapped in { services: [...] }
    const servicesArray = Array.isArray(body) ? body : body.services;

    if (!servicesArray || !Array.isArray(servicesArray)) {
      return c.json({ error: "Invalid import data" }, 400);
    }

    await runTask(async () => {
      const db = getDB();

      // Delete all existing services
      await db.delete(services);

      // Insert new services
      const newServices = servicesArray.map((svc: Partial<Service>) => ({
        id: svc.id || generateId(),
        name: svc.name || "",
        url: svc.url || "",
        icon: svc.icon || "",
        group: svc.group || "",
        order: svc.order ?? 0,
        public: svc.public ?? false,
        authRequired: svc.authRequired ?? false,
        newTab: svc.newTab ?? true,
        checkHealth: svc.checkHealth ?? false,
        healthStatus: (svc.healthStatus as any) ?? "unknown",
        lastChecked: svc.lastChecked || null,
      }));

      if (newServices.length > 0) {
        await db.insert(services).values(newServices);
      }
    });

    return c.json({ message: "Services imported successfully" });
  } catch (error: any) {
    console.error("[Services] Error importing services:", error);
    return c.json({ error: error.message }, 500);
  }
}

// GET /api/services/groups - Get distinct groups
export async function getServiceGroups(c: Context) {
  try {
    const db = getDB();
    const result = await db
      .selectDistinct({ group: services.group })
      .from(services);

    const groups = result.map((r) => r.group);
    return c.json(groups);
  } catch (error: any) {
    console.error("[Services] Error fetching groups:", error);
    return c.json({ error: error.message }, 500);
  }
}

// GET /api/services/:id/uptime - Get uptime history for a service
export async function getServiceUptime(c: Context) {
  try {
    const id = c.req.param("id");
    const history = await getUptimeHistory(id);

    return c.json({
      serviceId: id,
      hourly: history.hourly || [],
      daily: history.daily || [],
    });
  } catch (error: any) {
    console.error("[Services] Error fetching uptime:", error);
    return c.json({ error: error.message }, 500);
  }
}

// GET /api/services/uptime - Get uptime history for all services
export async function getAllServicesUptime(c: Context) {
  try {
    const db = getDB();
    const allServices = await db.select({ id: services.id }).from(services);

    const uptimeData = await Promise.all(
      allServices.map(async (svc) => {
        const history = await getUptimeHistory(svc.id);
        return {
          serviceId: svc.id,
          hourly: history.hourly || [],
          daily: history.daily || [],
        };
      }),
    );

    return c.json(uptimeData);
  } catch (error: any) {
    console.error("[Services] Error fetching all uptime data:", error);
    return c.json({ error: error.message }, 500);
  }
}
