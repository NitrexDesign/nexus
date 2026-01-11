// Widget registry for managing available widget types

import { WidgetDefinition } from './types';

class WidgetRegistry {
  private widgets: Map<string, WidgetDefinition> = new Map();

  register(widget: WidgetDefinition) {
    this.widgets.set(widget.id, widget);
  }

  get(id: string): WidgetDefinition | undefined {
    return this.widgets.get(id);
  }

  getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  getByCategory(category: string): WidgetDefinition[] {
    return this.getAll().filter(widget => widget.category === category);
  }

  getCategories(): string[] {
    const categories = new Set(this.getAll().map(widget => widget.category));
    return Array.from(categories);
  }
}

export const widgetRegistry = new WidgetRegistry();