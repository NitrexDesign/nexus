import { widgetRegistry } from "../registry";
import { MetricWidget } from "./MetricWidget";
import { InfoWidget } from "./InfoWidget";
import { LinkWidget } from "./LinkWidget";
import { StatusWidget } from "./StatusWidget";
import { ArcaneWidget } from "./ArcaneWidget";

// Auto-register all widget components
widgetRegistry.register("metric", MetricWidget);
widgetRegistry.register("info", InfoWidget);
widgetRegistry.register("link", LinkWidget);
widgetRegistry.register("status", StatusWidget);
widgetRegistry.register("arcane", ArcaneWidget);

// Export components for direct use if needed
export { MetricWidget, InfoWidget, LinkWidget, StatusWidget, ArcaneWidget };
