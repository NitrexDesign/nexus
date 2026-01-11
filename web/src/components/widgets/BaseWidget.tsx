"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Settings, X, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WidgetProps, WidgetDefinition } from '@/lib/widgets/types';
import { useWidgets, widgetRegistry } from '@/lib/widgets';

interface BaseWidgetProps extends WidgetProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function BaseWidget({
  config,
  onUpdateConfig,
  isEditing = false,
  title,
  icon,
  children,
  className,
}: BaseWidgetProps) {
  const { removeWidget } = useWidgets();
  const [showSettings, setShowSettings] = useState(false);

  const widgetDefinition = widgetRegistry.get(config.type);

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(true);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeWidget(config.id);
  };

  const handleSettingsChange = (newSettings: Record<string, any>) => {
    onUpdateConfig({ settings: newSettings });
  };

  return (
    <Card
      className={cn(
        "relative transition-all duration-200 hover:shadow-md",
        isEditing && "ring-2 ring-primary/50",
        !config.enabled && "opacity-50",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing && (
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
            )}
            {icon}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {isEditing && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSettingsClick}
                className="h-6 w-6 p-0"
              >
                <Settings className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveClick}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>

      {/* Settings Dialog */}
      {widgetDefinition?.settingsComponent && (
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{title} Settings</DialogTitle>
              <DialogDescription>
                Customize the appearance and behavior of this widget.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              {React.createElement(widgetDefinition.settingsComponent, {
                settings: config.settings,
                onSettingsChange: handleSettingsChange,
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}