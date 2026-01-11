// Widget registry initialization
import { widgetRegistry } from './registry';
import { DateTimeWidget, DateTimeWidgetSettings } from '@/components/widgets/DateTimeWidget';
import { TodoWidget, TodoWidgetSettings } from '@/components/widgets/TodoWidget';
import { SearchWidget, SearchWidgetSettings } from '@/components/widgets/SearchWidget';
import { WeatherWidget, WeatherWidgetSettings } from '@/components/widgets/WeatherWidget';

// Register all available widgets
widgetRegistry.register({
  id: 'datetime',
  name: 'Date & Time',
  description: 'Display current date and time with customizable format',
  icon: '🕐',
  category: 'utility',
  defaultSize: { width: 2, height: 1 },
  defaultSettings: {
    format: 'full',
    timezone: 'local',
    showSeconds: true,
  },
  component: DateTimeWidget,
  settingsComponent: DateTimeWidgetSettings,
});

widgetRegistry.register({
  id: 'weather',
  name: 'Weather',
  description: 'Current weather and forecast for your location',
  icon: '🌤️',
  category: 'information',
  defaultSize: { width: 2, height: 2 },
  defaultSettings: {
    location: 'auto',
    unit: 'celsius',
    showForecast: true,
    provider: 'openweathermap',
    apiKey: '',
    metOfficeApiKey: '',
  },
  component: WeatherWidget,
  settingsComponent: WeatherWidgetSettings,
});

widgetRegistry.register({
  id: 'todo',
  name: 'Todo List',
  description: 'Manage your tasks and stay organized',
  icon: '✅',
  category: 'productivity',
  defaultSize: { width: 2, height: 3 },
  minSize: { width: 2, height: 2 },
  defaultSettings: {
    maxItems: 5,
    showCompleted: false,
  },
  component: TodoWidget,
  settingsComponent: TodoWidgetSettings,
});

widgetRegistry.register({
  id: 'search',
  name: 'Web Search',
  description: 'Quick search with multiple search engines',
  icon: '🔍',
  category: 'utility',
  defaultSize: { width: 4, height: 1 },
  defaultSettings: {
    defaultEngine: 'google',
    showSuggestions: true,
  },
  component: SearchWidget,
  settingsComponent: SearchWidgetSettings,
});

// Export the registry for use in components
export { widgetRegistry } from './registry';
export { useWidgets, WidgetProvider } from './context';
export type { WidgetConfig, WidgetDefinition } from './types';