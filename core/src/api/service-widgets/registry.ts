import { WidgetHandler } from "./types";
import { arcaneWidget } from "./arcane";
import { metricWidget, infoWidget, linkWidget, statusWidget } from "./static";

class WidgetRegistry {
  private handlers = new Map<string, WidgetHandler>();

  register(handler: WidgetHandler): void {
    if (this.handlers.has(handler.type)) {
      console.warn(
        `[WidgetRegistry] Overwriting existing handler for type: ${handler.type}`,
      );
    }
    this.handlers.set(handler.type, handler);
    console.log(`[WidgetRegistry] Registered widget handler: ${handler.type}`);
  }

  get(type: string): WidgetHandler | undefined {
    return this.handlers.get(type);
  }

  getAll(): WidgetHandler[] {
    return Array.from(this.handlers.values());
  }

  getTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  async fetchWidgetData(
    type: string,
    settings: Record<string, any>,
    serviceUrl?: string,
  ): Promise<Record<string, any> | null> {
    const handler = this.get(type);
    if (!handler || !handler.fetchData) {
      return null;
    }
    return handler.fetchData(settings, serviceUrl);
  }
}

// Create and export singleton registry
export const widgetRegistry = new WidgetRegistry();

// Auto-register all widget handlers
widgetRegistry.register(metricWidget);
widgetRegistry.register(infoWidget);
widgetRegistry.register(linkWidget);
widgetRegistry.register(statusWidget);
widgetRegistry.register(arcaneWidget);
