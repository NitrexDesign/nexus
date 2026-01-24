import { WidgetComponent } from "./types";

/**
 * Widget Component Registry
 * Auto-registers widget component renderers and provides lookup by type
 */
class WidgetComponentRegistry {
  private components = new Map<string, WidgetComponent>();

  /**
   * Register a widget component renderer
   */
  register(type: string, component: WidgetComponent) {
    if (this.components.has(type)) {
      console.warn(
        `[WidgetRegistry] Widget type "${type}" already registered, overwriting`,
      );
    }
    this.components.set(type, component);
    console.log(`[WidgetRegistry] Registered widget component: ${type}`);
  }

  /**
   * Get a widget component renderer by type
   */
  get(type: string): WidgetComponent | undefined {
    return this.components.get(type);
  }

  /**
   * Check if a widget type is registered
   */
  has(type: string): boolean {
    return this.components.has(type);
  }

  /**
   * Get all registered widget types
   */
  getTypes(): string[] {
    return Array.from(this.components.keys());
  }
}

// Create singleton instance
export const widgetRegistry = new WidgetComponentRegistry();
