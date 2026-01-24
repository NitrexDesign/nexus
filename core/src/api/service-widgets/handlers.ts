import { Context } from "hono";
import { eq, and } from "drizzle-orm";
import { getDB } from "../../db/mysql";
import { serviceWidgets, services } from "../../db/schema";
import { runTask } from "../../db/task-queue";
import { generateId } from "../../utils/id";
import { widgetRegistry } from "./registry";
import { getErrorMessage } from "./types";

// GET /api/services/:serviceId/widgets - Get widgets for a service
export async function getServiceWidgets(c: Context) {
  try {
    const serviceId = c.req.param("serviceId");
    const db = getDB();

    // Get service URL
    const service = await db
      .select({ url: services.url })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    const serviceUrl = service[0]?.url;

    const widgets = await db
      .select()
      .from(serviceWidgets)
      .where(
        and(
          eq(serviceWidgets.serviceId, serviceId),
          eq(serviceWidgets.isVisible, true),
        ),
      )
      .orderBy(serviceWidgets.order);

    // Fetch live data for widgets that require it
    const widgetsWithData = await Promise.all(
      widgets.map(async (widget) => {
        // Ensure settings is an object (parse if string)
        const settings = typeof widget.settings === 'string' 
          ? JSON.parse(widget.settings) 
          : widget.settings || {};

        const liveData = await widgetRegistry.fetchWidgetData(
          widget.type,
          settings,
          serviceUrl,
        );

        if (liveData) {
          return {
            ...widget,
            settings,
            content: liveData,
          };
        }

        return {
          ...widget,
          settings,
        };
      }),
    );

    return c.json(widgetsWithData);
  } catch (error: unknown) {
    console.error("[Service Widgets] Error fetching widgets:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}

// GET /api/services/widgets/bulk - Get all widgets for all public services
export async function getBulkServiceWidgets(c: Context) {
  try {
    const db = getDB();

    // Get all public services with URLs
    const publicServices = await db
      .select({ id: services.id, url: services.url })
      .from(services)
      .where(eq(services.public, true));

    const serviceIds = publicServices.map((s) => s.id);
    const serviceUrlMap = new Map(
      publicServices.map((s) => [s.id, s.url])
    );

    if (serviceIds.length === 0) {
      return c.json({});
    }

    // Fetch all widgets for public services
    const allWidgets = await db
      .select()
      .from(serviceWidgets)
      .where(eq(serviceWidgets.isVisible, true))
      .orderBy(serviceWidgets.order);

    // Group widgets by serviceId and fetch live data
    const widgetsByService: Record<
      string,
      (typeof serviceWidgets.$inferSelect)[]
    > = {};

    await Promise.all(
      allWidgets.map(async (widget) => {
        if (serviceIds.includes(widget.serviceId)) {
          // Ensure settings is an object (parse if string)
          const settings = typeof widget.settings === 'string' 
            ? JSON.parse(widget.settings) 
            : widget.settings || {};

          let widgetData = { ...widget, settings };

          // Fetch live data for widgets that require it
          const serviceUrl = serviceUrlMap.get(widget.serviceId);
          const liveData = await widgetRegistry.fetchWidgetData(
            widget.type,
            settings,
            serviceUrl,
          );

          if (liveData) {
            widgetData = {
              ...widget,
              content: liveData,
            };
          }

          if (!widgetsByService[widget.serviceId]) {
            widgetsByService[widget.serviceId] = [];
          }
          widgetsByService[widget.serviceId].push(widgetData);
        }
      }),
    );

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

    console.log("[Create Widget] Received body:", JSON.stringify(body, null, 2));
    console.log("[Create Widget] Parsed settings:", settings);

    if (!type || !title || title.trim() === "") {
      return c.json(
        { error: "Missing required fields: type, title" },
        400,
      );
    }

    // Validate widget type exists
    if (!widgetRegistry.get(type)) {
      return c.json(
        {
          error: `Unknown widget type: ${type}`,
          availableTypes: widgetRegistry.getTypes(),
        },
        400,
      );
    }

    const newWidget: typeof serviceWidgets.$inferInsert = {
      id: generateId(),
      serviceId,
      type,
      title,
      content: content || {},
      settings: settings || {},
      order: order ?? 0,
      isVisible: isVisible !== undefined ? isVisible : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log("[Create Widget] Widget to insert:", JSON.stringify(newWidget, null, 2));

    await runTask(async () => {
      const db = getDB();
      await db.insert(serviceWidgets).values(newWidget);
    });

    console.log("[Create Widget] Widget saved successfully");

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

    if (body.type !== undefined) {
      // Validate widget type exists
      if (!widgetRegistry.get(body.type)) {
        return c.json(
          {
            error: `Unknown widget type: ${body.type}`,
            availableTypes: widgetRegistry.getTypes(),
          },
          400,
        );
      }
      updates.type = body.type;
    }
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

// GET /api/services/widgets/types - Get available widget types
export async function getWidgetTypes(c: Context) {
  try {
    const types = widgetRegistry.getTypes();
    return c.json(types);
  } catch (error: unknown) {
    console.error("[Service Widgets] Error fetching widget types:", error);
    return c.json({ error: getErrorMessage(error) }, 500);
  }
}
