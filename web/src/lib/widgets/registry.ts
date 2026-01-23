// Widgets registry removed — minimal stub for compatibility

export const widgetRegistry = {
  get: (_id: string) => undefined,
  getAll: () => [] as any[],
  getByCategory: (_: string) => [] as any[],
  getCategories: () => [] as string[],
};
