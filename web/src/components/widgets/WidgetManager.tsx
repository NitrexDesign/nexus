"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useWidgets, widgetRegistry } from '@/lib/widgets';
import { Settings, Power, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function WidgetManager() {
  const { widgets, toggleWidget, removeWidget, updateWidget } = useWidgets();
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);

  const getWidgetDefinition = (type: string) => widgetRegistry.get(type);

  const enabledCount = widgets.filter(w => w.enabled).length;
  const totalCount = widgets.length;

  if (totalCount === 0) {
    return (
      <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed">
        <p className="text-muted-foreground font-medium">No widgets added yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Go to the "Add Widgets" tab to get started!
        </p>
      </div>
    );
  }

  const editingWidget = widgets.find(w => w.id === editingWidgetId);
  const editingDefinition = editingWidget ? getWidgetDefinition(editingWidget.type) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Active Widgets</h3>
          <p className="text-xs text-muted-foreground">Manage your current dashboard layout.</p>
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          {enabledCount}/{totalCount} Active
        </Badge>
      </div>

      <div className="grid gap-3">
        {widgets.map((widget) => {
          const definition = getWidgetDefinition(widget.type);
          if (!definition) return null;

          return (
            <Card key={widget.id} className={cn(
              "relative overflow-hidden transition-all duration-200 border-l-4",
              widget.enabled ? "border-l-primary" : "border-l-muted opacity-70"
            )}>
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center text-2xl shrink-0 border shadow-sm">
                    {definition.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold truncate">{definition.name}</h4>
                      {!widget.enabled && (
                        <Badge variant="outline" className="text-[10px] h-4 py-0 px-1 uppercase tracking-wider font-bold">Disabled</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{definition.description}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/60">
                      <span>{widget.position.width}×{widget.position.height} Grid</span>
                      <span>Pos: {widget.position.x},{widget.position.y}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "size-9 rounded-lg transition-colors",
                      widget.enabled ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted"
                    )}
                    onClick={() => toggleWidget(widget.id)}
                    title={widget.enabled ? "Disable widget" : "Enable widget"}
                  >
                    <Power className="size-4" />
                  </Button>
                  
                  {definition.settingsComponent && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-lg"
                      onClick={() => setEditingWidgetId(widget.id)}
                      title="Widget settings"
                    >
                      <Settings className="size-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (confirm("Remove this widget?")) {
                        removeWidget(widget.id);
                      }
                    }}
                    title="Remove widget"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Settings Dialog for Manager */}
      {editingWidget && editingDefinition?.settingsComponent && (
        <Dialog open={!!editingWidgetId} onOpenChange={(open) => !open && setEditingWidgetId(null)}>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black">{editingDefinition.name} Settings</DialogTitle>
              <DialogDescription>
                Customize the appearance and behavior of this widget.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {React.createElement(editingDefinition.settingsComponent, {
                settings: editingWidget.settings,
                onSettingsChange: (newSettings: any) => {
                  updateWidget(editingWidget.id, { settings: newSettings });
                },
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
