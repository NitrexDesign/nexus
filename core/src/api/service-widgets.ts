import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { serviceWidgets, services } from "../db/schema";
import { runTask } from "../db/task-queue";
import { generateId } from "../utils/id";

// Helper to safely get error message
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// GET /api/services/:serviceId/widgets - Get widgets for a service
export async function getServiceWidgets(c: Context) {
  try {
    const serviceId = c.req.param("serviceId");
    const db = getDB();

    const widgets = await db
      .select()
      .from(serviceWidgets)
      .where(
        and(
          eq(serviceWidgets.serviceId, serviceId),
          eq(serviceWidgets.isVisible, 1),
        ),
      )
      .orderBy(serviceWidgets.order);

    return c.json(widgets);
  } catch (error: unknown) {
    console.error("[Service Widgets] Error fetching widgets:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// GET /api/services/widgets/bulk - Get all widgets for all public services
export async function getBulkServiceWidgets(c: Context) {
  try {
    const db = getDB();

    // Get all public services
    const publicServices = await db
      .select({ id: services.id })
      .from(services)
      .where(eq(services.public, 1));

    const serviceIds = publicServices.map((s) => s.id);

    if (serviceIds.length === 0) {
      return c.json({});
    }

    // Fetch all widgets for public services
    const allWidgets = await db
      .select()
      .from(serviceWidgets)
      .where(eq(serviceWidgets.isVisible, 1))
      .orderBy(serviceWidgets.order);

    // Group widgets by serviceId
    const widgetsByService: Record<
      string,
      (typeof serviceWidgets.$inferSelect)[]
    > = {};

    allWidgets.forEach((widget) => {
      if (serviceIds.includes(widget.serviceId)) {
        if (!widgetsByService[widget.serviceId]) {
          widgetsByService[widget.serviceId] = [];
        }
        widgetsByService[widget.serviceId].push(widget);
      }
    });

    return c.json(widgetsByService);
  } catch (error: unknown) {
    console.error("[Service Widgets] Error fetching bulk widgets:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// POST /api/services/:serviceId/widgets - Create widget (admin only)
export async function createServiceWidget(c: Context) {
  try {
    const serviceId = c.req.param("serviceId");
    const body = await c.req.json();
    const { type, title, content, settings, order, isVisible } = body;

    if (!type || title === undefined || !content) {
      return c.json(
        { error: "Missing required fields: type, title, content" },
        400,
      );
    }

    const newWidget: typeof serviceWidgets.$inferInsert = {
      id: generateId(),
      serviceId,
      type,
      title,
      content,
      settings: settings || {},
      order: order ?? 0,
      isVisible: isVisible !== undefined ? isVisible : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await runTask(async () => {
      const db = getDB();
      await db.insert(serviceWidgets).values(newWidget);
    });

    return c.json(newWidget, 201);
  } catch (error: unknown) {
    console.error("[Service Widgets] Error creating widget:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// PUT /api/services/widgets/:id - Update widget (admin only)
export async function updateServiceWidget(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    const updates: Partial<typeof serviceWidgets.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.type !== undefined) updates.type = body.type;
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.settings !== undefined) updates.settings = body.settings;
    if (body.order !== undefined) updates.order = body.order;
    if (body.isVisible !== undefined) updates.isVisible = body.isVisible;

    await runTask(async () => {
      const db = getDB();
      await db
        .update(serviceWidgets)
        .set(updates)
        .where(eq(serviceWidgets.id, id));
    });

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error("[Service Widgets] Error updating widget:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// DELETE /api/services/widgets/:id - Delete widget (admin only)
export async function deleteServiceWidget(c: Context) {
  try {
    const id = c.req.param("id");

    await runTask(async () => {
      const db = getDB();
      await db.delete(serviceWidgets).where(eq(serviceWidgets.id, id));
    });

    return c.json({ success: true });
  } catch (error: unknown) {
    console.error("[Service Widgets] Error deleting widget:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// GET /api/services/widgets/admin/:serviceId - Get all widgets including hidden (admin only)
export async function getAdminServiceWidgets(c: Context) {
  try {
    const serviceId = c.req.param("serviceId");
    const db = getDB();

    const widgets = await db
      .select()
      .from(serviceWidgets)
      .where(eq(serviceWidgets.serviceId, serviceId))
      .orderBy(serviceWidgets.order);

    return c.json(widgets);
  } catch (error: unknown) {
    console.error("[Service Widgets] Error fetching admin widgets:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}
