import type { WidgetDefinition } from "./types";
import { DateTimeWidget } from "@/components/widgets/DateTimeWidget";
import { SearchWidget } from "@/components/widgets/SearchWidget";
import { TodoWidget } from "@/components/widgets/TodoWidget";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";

class WidgetRegistry {
  private widgets = new Map<string, WidgetDefinition>();

  register(definition: WidgetDefinition) {
    this.widgets.set(definition.type, definition);
  }

  get(type: string): WidgetDefinition | undefined {
    return this.widgets.get(type);
  }

  getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  getByCategory(category: string): WidgetDefinition[] {
    return this.getAll().filter((w) => w.category === category);
  }

  getCategories(): string[] {
    const categories = new Set<string>();
    this.getAll().forEach((w) => {
      if (w.category) categories.add(w.category);
    });
    return Array.from(categories);
  }
}

export const widgetRegistry = new WidgetRegistry();

// Register built-in widgets
widgetRegistry.register({
  type: "datetime",
  name: "Date & Time",
  description: "Display current date and time",
  component: DateTimeWidget,
  defaultSize: { width: 2, height: 1 },
  category: "utilities",
  defaultSettings: {},
});

widgetRegistry.register({
  type: "search",
  name: "Search",
  description: "Quick search widget",
  component: SearchWidget,
  defaultSize: { width: 3, height: 1 },
  category: "utilities",
  defaultSettings: {},
});

widgetRegistry.register({
  type: "todo",
  name: "Todo List",
  description: "Manage your tasks",
  component: TodoWidget,
  defaultSize: { width: 2, height: 2 },
  category: "productivity",
  defaultSettings: {},
});

widgetRegistry.register({
  type: "weather",
  name: "Weather",
  description: "Current weather information",
  component: WeatherWidget,
  defaultSize: { width: 2, height: 2 },
  category: "information",
  defaultSettings: { location: "San Francisco" },
});
