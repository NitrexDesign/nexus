# Service Widget Components

This directory contains modular service widget components that are automatically registered at runtime.

## Structure

- **Individual widget files**: Each widget type has its own component file
- **`index.ts`**: Auto-registers all widgets with the registry
- **Widget components**: React components that accept `WidgetComponentProps`

## Adding a New Widget Component

### 1. Create the widget component file

Create `web/src/components/service-widgets/widgets/MyWidget.tsx`:

```tsx
import { WidgetComponentProps } from "../types";
import { SomeIcon } from "lucide-react";

export function MyWidget({ widget }: WidgetComponentProps) {
  const { customField } = widget.content;

  return (
    <div className="p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <SomeIcon size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">{widget.title}</span>
      </div>
      <div className="text-sm text-muted-foreground mt-2">{customField}</div>
    </div>
  );
}
```

### 2. Register in `index.ts`

Add to `web/src/components/service-widgets/widgets/index.ts`:

```tsx
import { MyWidget } from "./MyWidget";

// ... existing imports ...

// Register your widget
widgetRegistry.register("my-widget", MyWidget);

// Export for direct use
export { MyWidget };
```

### 3. That's it! 🎉

The widget will automatically be available in the `ServiceWidgetRenderer`. No need to modify the switch statement or any other files.

## Widget Component Props

All widget components receive:

```tsx
interface WidgetComponentProps {
  widget: ServiceWidget;
}

interface ServiceWidget {
  id: string;
  serviceId: string;
  type: string; // Widget type identifier
  title: string; // Display title
  content: Record<string, any>; // Widget-specific data
  settings: Record<string, any>; // Configuration
  order: number;
  isVisible: boolean;
}
```

## Design Guidelines

- **Keep components focused**: Each widget should do one thing well
- **Use Tailwind**: Follow existing patterns for consistency
- **Handle errors gracefully**: Display friendly error messages
- **Use lucide-react icons**: For consistent iconography
- **Follow naming**: Use `<Type>Widget` naming convention
- **TypeScript types**: Extract content fields for better type safety

## Examples

See existing widgets:

- **MetricWidget**: Simple numeric display with icon
- **InfoWidget**: Text with icon and description
- **LinkWidget**: Clickable button that opens URL
- **StatusWidget**: Badge with color-coded status
- **ArcaneWidget**: Complex multi-field display with live data
