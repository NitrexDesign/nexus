// Widget system types and interfaces

export interface WidgetConfig {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings: Record<string, any>;
  enabled: boolean;
  order: number;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  defaultSize: {
    width: number;
    height: number;
  };
  minSize?: {
    width: number;
    height: number;
  };
  defaultSettings: Record<string, any>;
  component: React.ComponentType<WidgetProps>;
  settingsComponent?: React.ComponentType<WidgetSettingsProps<Record<string, any>>>;
}

export interface WidgetProps {
  config: WidgetConfig;
  onUpdateConfig: (config: Partial<WidgetConfig>) => void;
  isEditing?: boolean;
}

export interface WidgetSettingsProps<T = Record<string, any>> {
  settings: T;
  onSettingsChange: (settings: T) => void;
}

export interface WidgetContextType {
  widgets: WidgetConfig[];
  addWidget: (type: string, position?: { x: number; y: number }) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void;
  toggleWidget: (id: string) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
  categoryOrder: string[];
  reorderCategories: (newOrder: string[]) => void;
  gridSettings: {
    cols: number;
    rows: number;
  };
  updateGridSettings: (cols: number, rows: number) => void;
  isLoading: boolean;
}