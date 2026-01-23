// Widgets feature removed — stub exports to avoid runtime errors

export const widgetRegistry = {
  get: () => undefined,
  getAll: () => [],
  getCategories: () => [] as string[],
};

export function useWidgets() {
  throw new Error("Widgets feature has been removed");
}

export const WidgetProvider = ({ children }: { children: any }) => children;

// NOTE: widget types and actual implementation have been removed.
