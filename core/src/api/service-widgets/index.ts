// Re-export registry and types for convenient access
export { widgetRegistry } from "./registry";
export type { WidgetHandler, WidgetContext } from "./types";
export { getErrorMessage } from "./types";

// Export individual widget handlers for direct access if needed
export { arcaneWidget } from "./arcane";
export { metricWidget, infoWidget, linkWidget, statusWidget } from "./static";
