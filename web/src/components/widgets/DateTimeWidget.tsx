"use client";

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';
import { BaseWidget } from './BaseWidget';
import { WidgetProps } from '@/lib/widgets/types';

type DateTimeFormat = 'full' | 'date' | 'time' | 'compact';

interface DateTimeSettings {
  format: DateTimeFormat;
  timezone: string;
  showSeconds: boolean;
}

const TIMEZONES = [
  { value: 'local', label: 'Local Time' },
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

export function DateTimeWidget({ config, onUpdateConfig, isEditing }: WidgetProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  const settings = config.settings as DateTimeSettings;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, settings.showSeconds ? 1000 : 60000);

    return () => clearInterval(timer);
  }, [settings.showSeconds]);

  const getFormattedTime = () => {
    let dateToFormat = currentTime;

    if (settings.timezone !== 'local') {
      if (settings.timezone === 'UTC') {
        dateToFormat = new Date(currentTime.toISOString());
      } else {
        try {
          dateToFormat = new Date(currentTime.toLocaleString('en-US', { timeZone: settings.timezone }));
        } catch (error) {
          console.error('Invalid timezone:', settings.timezone);
        }
      }
    }

    switch (settings.format) {
      case 'full':
        return format(dateToFormat, `EEEE, MMMM d, yyyy 'at' ${settings.showSeconds ? 'HH:mm:ss' : 'HH:mm'}`);
      case 'date':
        return format(dateToFormat, 'EEEE, MMMM d, yyyy');
      case 'time':
        return format(dateToFormat, settings.showSeconds ? 'HH:mm:ss' : 'HH:mm');
      case 'compact':
        return format(dateToFormat, `MMM d, ${settings.showSeconds ? 'HH:mm:ss' : 'HH:mm'}`);
      default:
        return format(dateToFormat, 'PPP p');
    }
  };

  const getTimezoneLabel = () => {
    const tz = TIMEZONES.find(t => t.value === settings.timezone);
    return tz ? tz.label : settings.timezone;
  };

  return (
    <BaseWidget
      config={config}
      onUpdateConfig={onUpdateConfig}
      isEditing={isEditing}
      title="Date & Time"
      icon={<Clock className="h-4 w-4" />}
      className="h-full"
    >
      <div className="flex flex-col items-center justify-center h-full space-y-2">
        <div className="text-2xl font-bold text-center">
          {getFormattedTime()}
        </div>
        {settings.timezone !== 'local' && (
          <div className="text-xs text-muted-foreground">
            {getTimezoneLabel()}
          </div>
        )}
      </div>
    </BaseWidget>
  );
}

// Settings component for the Date & Time widget
export function DateTimeWidgetSettings({ settings, onSettingsChange }: { settings: Record<string, any>; onSettingsChange: (settings: Record<string, any>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Format</label>
        <select
          value={settings.format}
          onChange={(e) => onSettingsChange({ ...settings, format: e.target.value as DateTimeFormat })}
          className="w-full mt-1 p-2 border rounded-md"
        >
          <option value="full">Full (Day, Month Date, Year at Time)</option>
          <option value="date">Date Only</option>
          <option value="time">Time Only</option>
          <option value="compact">Compact (Mon DD, HH:MM)</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Timezone</label>
        <select
          value={settings.timezone}
          onChange={(e) => onSettingsChange({ ...settings, timezone: e.target.value })}
          className="w-full mt-1 p-2 border rounded-md"
        >
          {TIMEZONES.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="showSeconds"
          checked={settings.showSeconds}
          onChange={(e) => onSettingsChange({ ...settings, showSeconds: e.target.checked })}
        />
        <label htmlFor="showSeconds" className="text-sm">Show seconds</label>
      </div>
    </div>
  );
}