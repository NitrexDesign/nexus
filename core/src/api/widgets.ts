import { Context } from "hono";
import { eq } from "drizzle-orm";
import { getDB } from "../db/mysql";
import { widgetSettings, widgetConfigs } from "../db/schema";
import { runTask } from "../db/task-queue";
import { generateId } from "../utils/id";

// GET /api/widgets/settings - Get widget settings
export async function getWidgetSettings(c: Context) {
  try {
    const db = getDB();
    const [settings] = await db
      .select()
      .from(widgetSettings)
      .where(eq(widgetSettings.id, "default"))
      .limit(1);

    // Return default settings if not found
    if (!settings) {
      return c.json({
        id: "default",
        categoryOrder: null,
        gridCols: 4,
        gridRows: 6,
        updatedAt: new Date(),
      });
    }

    return c.json(settings);
  } catch (error: any) {
    console.error("[Widgets] Error fetching settings:", error);
    return c.json({ error: error.message }, 500);
  }
}

// PUT /api/widgets/settings - Update widget settings
export async function updateWidgetSettings(c: Context) {
  try {
    const body = await c.req.json();

    await runTask(async () => {
      const db = getDB();

      // Try to update first
      const _result = await db
        .update(widgetSettings)
        .set({
          categoryOrder: body.categoryOrder,
          gridCols: body.gridCols,
          gridRows: body.gridRows,
          updatedAt: new Date(),
        })
        .where(eq(widgetSettings.id, "default"));

      // If no rows affected, insert
      // Note: Drizzle doesn't return affected rows easily, so we'll do an upsert-style approach
      // We'll just always try insert with ON DUPLICATE KEY logic
      try {
        await db.insert(widgetSettings).values({
          id: "default",
          categoryOrder: body.categoryOrder,
          gridCols: body.gridCols,
          gridRows: body.gridRows,
          updatedAt: new Date(),
        });
      } catch {
        // Already updated above
      }
    });

    return c.json({ message: "Settings updated" });
  } catch (error: any) {
    console.error("[Widgets] Error updating settings:", error);
    return c.json({ error: error.message }, 500);
  }
}

// GET /api/widgets/settings/category-order - Get category order
export async function getCategoryOrder(c: Context) {
  try {
    const db = getDB();
    const [settings] = await db
      .select({ categoryOrder: widgetSettings.categoryOrder })
      .from(widgetSettings)
      .where(eq(widgetSettings.id, "default"))
      .limit(1);

    return c.json(settings?.categoryOrder || []);
  } catch (error: any) {
    console.error("[Widgets] Error fetching category order:", error);
    return c.json({ error: error.message }, 500);
  }
}

// PUT /api/widgets/settings/category-order - Update category order
export async function updateCategoryOrder(c: Context) {
  try {
    const body = await c.req.json<string[]>();

    await runTask(async () => {
      const db = getDB();
      await db
        .update(widgetSettings)
        .set({
          categoryOrder: body,
          updatedAt: new Date(),
        })
        .where(eq(widgetSettings.id, "default"));
    });

    return c.json({ message: "Category order updated" });
  } catch (error: any) {
    console.error("[Widgets] Error updating category order:", error);
    return c.json({ error: error.message }, 500);
  }
}

// GET /api/widgets - List all widget configs
export async function getWidgetConfigs(c: Context) {
  try {
    const db = getDB();
    const configs = await db.select().from(widgetConfigs);
    return c.json(configs);
  } catch (error: any) {
    console.error("[Widgets] Error fetching widget configs:", error);
    return c.json({ error: error.message }, 500);
  }
}

// POST /api/widgets - Create widget config
export async function createWidgetConfig(c: Context) {
  try {
    const body = await c.req.json();

    const newConfig: typeof widgetConfigs.$inferInsert = {
      id: body.id || generateId(),
      widgetType: body.widgetType,
      positionX: body.positionX,
      positionY: body.positionY,
      width: body.width,
      height: body.height,
      settings: body.settings || {},
      enabled: body.enabled ?? true,
      sortOrder: body.sortOrder ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await runTask(async () => {
      const db = getDB();
      await db.insert(widgetConfigs).values(newConfig);
    });

    return c.json(newConfig, 201);
  } catch (error: any) {
    console.error("[Widgets] Error creating widget config:", error);
    return c.json({ error: error.message }, 500);
  }
}

// GET /api/widgets/:id - Get single widget config
export async function getWidgetConfig(c: Context) {
  try {
    const id = c.req.param("id");
    const db = getDB();

    const [config] = await db
      .select()
      .from(widgetConfigs)
      .where(eq(widgetConfigs.id, id))
      .limit(1);

    if (!config) {
      return c.json({ error: "Widget config not found" }, 404);
    }

    return c.json(config);
  } catch (error: any) {
    console.error("[Widgets] Error fetching widget config:", error);
    return c.json({ error: error.message }, 500);
  }
}

// PUT /api/widgets/:id - Update widget config (upsert)
export async function updateWidgetConfig(c: Context) {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await runTask(async () => {
      const db = getDB();

      // Try update first
      const _updated = await db
        .update(widgetConfigs)
        .set({
          widgetType: body.widgetType,
          positionX: body.positionX,
          positionY: body.positionY,
          width: body.width,
          height: body.height,
          settings: body.settings,
          enabled: body.enabled,
          sortOrder: body.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(widgetConfigs.id, id));

      // If no rows updated, insert
      // For simplicity, we'll catch the error and do nothing if update succeeded
      try {
        await db.insert(widgetConfigs).values({
          id,
          widgetType: body.widgetType,
          positionX: body.positionX,
          positionY: body.positionY,
          width: body.width,
          height: body.height,
          settings: body.settings || {},
          enabled: body.enabled ?? true,
          sortOrder: body.sortOrder ?? 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch {
        // Update succeeded
      }
    });

    return c.json({ message: "Widget config updated" });
  } catch (error: any) {
    console.error("[Widgets] Error updating widget config:", error);
    return c.json({ error: error.message }, 500);
  }
}

// DELETE /api/widgets/:id - Delete widget config
export async function deleteWidgetConfig(c: Context) {
  try {
    const id = c.req.param("id");

    await runTask(async () => {
      const db = getDB();
      await db.delete(widgetConfigs).where(eq(widgetConfigs.id, id));
    });

    return c.json({ message: "Widget config deleted" });
  } catch (error: any) {
    console.error("[Widgets] Error deleting widget config:", error);
    return c.json({ error: error.message }, 500);
  }
}
