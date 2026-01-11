"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WidgetConfig, WidgetContextType } from './types';
import { widgetRegistry } from './registry';
import { toast } from 'sonner';

const WidgetContext = createContext<WidgetContextType | undefined>(undefined);

const STORAGE_KEY = 'nexus_widgets';

const DEFAULT_WIDGETS: WidgetConfig[] = [];

// Backend API types
interface BackendWidgetConfig {
  id: string;
  widget_type: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  settings: Record<string, any>;
  enabled: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

// Convert backend WidgetConfig to frontend WidgetConfig
function backendToFrontend(config: BackendWidgetConfig): WidgetConfig {
  return {
    id: config.id,
    type: config.widget_type,
    position: config.position,
    settings: config.settings,
    enabled: config.enabled,
    order: config.sort_order,
  };
}

// Convert frontend WidgetConfig to backend WidgetConfig
function frontendToBackend(config: WidgetConfig): Omit<BackendWidgetConfig, 'created_at' | 'updated_at'> {
  return {
    id: config.id,
    widget_type: config.type,
    position: config.position,
    settings: config.settings,
    enabled: config.enabled,
    sort_order: config.order,
  };
}

export function WidgetProvider({ children }: { children: ReactNode }) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [gridSettings, setGridSettings] = useState({ cols: 4, rows: 6 });
  const [isLoading, setIsLoading] = useState(true);

  // Load widgets from API on mount
  useEffect(() => {
    const loadWidgets = async () => {
      try {
        const res = await fetch('/api/widgets/configs');
        if (res.ok) {
          const configs: BackendWidgetConfig[] = await res.json();
          const frontendWidgets = configs.map(backendToFrontend);
          setWidgets(frontendWidgets);
        } else {
          console.error('Failed to load widgets from API, status:', res.status);
          // Fall back to default widgets if API fails
          console.warn('Using default widgets due to API failure');
          setWidgets(DEFAULT_WIDGETS);
          toast.error('Failed to load saved widgets. Using defaults.');
        }
      } catch (error) {
        console.error('Failed to load widgets:', error);
        // Fall back to default widgets if API fails
        console.warn('Using default widgets due to connection error');
        setWidgets(DEFAULT_WIDGETS);
        toast.error('Failed to connect to server. Using default widgets.');
      }
    };

    const loadSettings = async () => {
      try {
        const res = await fetch('/api/widgets/settings');
        if (res.ok) {
          const data = await res.json();
          setGridSettings({
            cols: data.grid_cols || 4,
            rows: data.grid_rows || 6,
          });
          setCategoryOrder(data.category_order || []);
        }
      } catch (error) {
        console.error('Failed to load widget settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWidgets();
    loadSettings();
  }, []);

  const updateGridSettings = async (cols: number, rows: number) => {
    try {
      const res = await fetch('/api/widgets/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grid_cols: cols,
          grid_rows: rows,
          category_order: categoryOrder,
        }),
      });

      if (res.ok) {
        setGridSettings({ cols, rows });
      }
    } catch (error) {
      console.error('Failed to update grid settings:', error);
    }
  };

  const addWidget = async (type: string, position?: { x: number; y: number }) => {
    const definition = widgetRegistry.get(type);
    if (!definition) return;

    const newWidget: WidgetConfig = {
      id: `${type}-${Date.now()}`,
      type,
      position: position ? {
        ...position,
        width: definition.defaultSize.width,
        height: definition.defaultSize.height
      } : {
        x: 0,
        y: 0,
        width: definition.defaultSize.width,
        height: definition.defaultSize.height
      },
      settings: { ...definition.defaultSettings },
      enabled: true,
      order: widgets.length,
    };

    try {
      const res = await fetch('/api/widgets/configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frontendToBackend(newWidget)),
      });

      if (res.ok) {
        const createdConfig: BackendWidgetConfig = await res.json();
        const frontendWidget = backendToFrontend(createdConfig);
        setWidgets(prev => [...prev, frontendWidget]);
        toast.success(`${definition?.name || 'Widget'} added successfully`);
      } else {
        console.error('Failed to create widget, status:', res.status);
        toast.error('Failed to add widget. Please try again.');
      }
    } catch (error) {
      console.error('Failed to create widget:', error);
      toast.error('Failed to add widget. Please check your connection.');
    }
  };

  const removeWidget = async (id: string) => {
    try {
      const res = await fetch(`/api/widgets/configs/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setWidgets(prev => prev.filter(widget => widget.id !== id));
        toast.success('Widget removed successfully');
      } else {
        console.error('Failed to delete widget, status:', res.status);
        toast.error('Failed to remove widget. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete widget:', error);
      toast.error('Failed to remove widget. Please check your connection.');
    }
  };

  const updateWidget = async (id: string, updates: Partial<WidgetConfig>) => {
    const currentWidget = widgets.find(w => w.id === id);
    if (!currentWidget) return;

    const updatedWidget = { ...currentWidget, ...updates };

    try {
      const res = await fetch(`/api/widgets/configs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frontendToBackend(updatedWidget)),
      });

      if (res.ok) {
        const updatedConfig: BackendWidgetConfig = await res.json();
        const frontendWidget = backendToFrontend(updatedConfig);
        setWidgets(prev => prev.map(widget =>
          widget.id === id ? frontendWidget : widget
        ));
      } else {
        console.error('Failed to update widget, status:', res.status);
        toast.error('Failed to update widget. Please try again.');
      }
    } catch (error) {
      console.error('Failed to update widget:', error);
      toast.error('Failed to update widget. Please check your connection.');
    }
  };

  const toggleWidget = async (id: string) => {
    const currentWidget = widgets.find(w => w.id === id);
    if (!currentWidget) return;

    const updatedWidget = { ...currentWidget, enabled: !currentWidget.enabled };

    try {
      const res = await fetch(`/api/widgets/configs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(frontendToBackend(updatedWidget)),
      });

      if (res.ok) {
        const updatedConfig: BackendWidgetConfig = await res.json();
        const frontendWidget = backendToFrontend(updatedConfig);
        setWidgets(prev => prev.map(widget =>
          widget.id === id ? frontendWidget : widget
        ));
      } else {
        console.error('Failed to toggle widget, status:', res.status);
      }
    } catch (error) {
      console.error('Failed to toggle widget:', error);
    }
  };

  const reorderCategories = async (newOrder: string[]) => {
    try {
      const res = await fetch('/api/widgets/category-order', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ category_order: newOrder }),
      });

      if (res.ok) {
        setCategoryOrder(newOrder);
      } else {
        console.error('Failed to save category order, status:', res.status);
      }
    } catch (error) {
      console.error('Failed to save category order:', error);
    }
  };

  const value: WidgetContextType = {
    widgets,
    addWidget,
    removeWidget,
    updateWidget,
    toggleWidget,
    isEditing,
    setIsEditing,
    categoryOrder,
    reorderCategories,
    gridSettings,
    updateGridSettings,
    isLoading,
  };

  return (
    <WidgetContext.Provider value={value}>
      {children}
    </WidgetContext.Provider>
  );
}

export function useWidgets() {
  const context = useContext(WidgetContext);
  if (context === undefined) {
    throw new Error('useWidgets must be used within a WidgetProvider');
  }
  return context;
}