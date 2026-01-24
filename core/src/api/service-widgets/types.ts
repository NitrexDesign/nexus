export interface WidgetHandler {
  type: string;
  fetchData?: (
    settings: Record<string, any>,
    serviceUrl?: string,
  ) => Promise<Record<string, any>>;
}

export interface WidgetContext {
  widget: {
    id: string;
    serviceId: string;
    type: string;
    title: string;
    content: Record<string, any>;
    settings: Record<string, any>;
    order: number;
    isVisible: boolean;
  };
}

// Helper to safely get error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
