// Widgets API removed - endpoints no longer available
import { Context } from "hono";

export async function widgetsDisabled(c: Context) {
  return c.json({ error: "Widgets feature has been removed" }, 404);
}

export const getWidgetSettings = widgetsDisabled;
export const updateWidgetSettings = widgetsDisabled;
export const getCategoryOrder = widgetsDisabled;
export const updateCategoryOrder = widgetsDisabled;
export const getWidgetConfigs = widgetsDisabled;
export const createWidgetConfig = widgetsDisabled;
export const getWidgetConfig = widgetsDisabled;
export const updateWidgetConfig = widgetsDisabled;
export const deleteWidgetConfig = widgetsDisabled;
