// Widget configuration and types

export interface WidgetConfig {
  id: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  settings?: Record<string, any>;
}

export interface WidgetDefinition {
  type: string;
  name: string;
  description: string;
  component: React.ComponentType<WidgetProps>;
  settingsComponent?: React.ComponentType<WidgetSettingsProps>;
  defaultSize: { width: number; height: number };
  minSize?: { width: number; height: number };
  maxSize?: { width: number; height: number };
}

export interface WidgetProps {
  config: WidgetConfig;
  onUpdateConfig?: (config: Partial<WidgetConfig>) => void;
  isEditing?: boolean;
}

export interface WidgetSettingsProps<T = any> {
  settings: T;
  onSave: (settings: T) => void;
  onCancel: () => void;
}

export interface WidgetContextType {
  widgets: WidgetConfig[];
  addWidget: (type: string) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<WidgetConfig>) => void;
  isEditing: boolean;
  setIsEditing: (editing: boolean) => void;
}
