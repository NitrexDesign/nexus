# Frontend Widget System Refactoring

## Overview

The frontend widget system has been refactored from a monolithic switch-statement approach to a modular, registry-based architecture that mirrors the backend implementation.

## Architecture Changes

### Before (Monolithic)

```
web/src/components/service-widgets/
└── index.tsx (248 lines)
    ├── All widget components inline
    ├── Switch statement for rendering
    └── Hard to add new widgets
```

### After (Modular)

```
web/src/components/service-widgets/
├── index.tsx (53 lines) - Main exports & renderer
├── types.ts - Shared TypeScript interfaces
├── registry.ts - Widget component registry
└── widgets/
    ├── MetricWidget.tsx
    ├── InfoWidget.tsx
    ├── LinkWidget.tsx
    ├── StatusWidget.tsx
    ├── ArcaneWidget.tsx
    ├── index.ts - Auto-registration
    └── README.md - Developer guide
```

## Key Features

### 1. Auto-Registration

Widgets are automatically registered when imported:

```tsx
// widgets/index.ts
import { widgetRegistry } from "../registry";
import { MetricWidget } from "./MetricWidget";

widgetRegistry.register("metric", MetricWidget);
```

### 2. Registry-Based Rendering

No more switch statements:

```tsx
// Before
switch (widget.type) {
  case "metric":
    return <MetricWidget />;
  case "info":
    return <InfoWidget />;
  // ...
}

// After
const WidgetComponent = widgetRegistry.get(widget.type);
return <WidgetComponent widget={widget} />;
```

### 3. Consistent Props Interface

All widgets use the same props:

```tsx
interface WidgetComponentProps {
  widget: ServiceWidget;
}
```

## Benefits

✅ **Scalability**: Add hundreds of widgets without touching core files
✅ **Maintainability**: Each widget isolated in its own file
✅ **Type Safety**: Shared interfaces ensure consistency
✅ **Zero Boilerplate**: Registry handles all the wiring
✅ **Developer Experience**: Clear documentation and examples

## Adding a New Widget

### 1. Create component file

```tsx
// widgets/MyWidget.tsx
import { WidgetComponentProps } from "../types";

export function MyWidget({ widget }: WidgetComponentProps) {
  return <div>{widget.title}</div>;
}
```

### 2. Register in widgets/index.ts

```tsx
import { MyWidget } from "./MyWidget";
widgetRegistry.register("my-widget", MyWidget);
export { MyWidget };
```

### 3. Done! 🎉

The widget is now available throughout the app.

## Comparison with Backend

The frontend now mirrors the backend architecture:

| Backend                                    | Frontend                                                      |
| ------------------------------------------ | ------------------------------------------------------------- |
| `core/src/api/service-widgets/types.ts`    | `web/src/components/service-widgets/types.ts`                 |
| `core/src/api/service-widgets/registry.ts` | `web/src/components/service-widgets/registry.ts`              |
| `core/src/api/service-widgets/arcane.ts`   | `web/src/components/service-widgets/widgets/ArcaneWidget.tsx` |
| `WidgetHandler` interface                  | `WidgetComponent` type                                        |
| `fetchData()` method                       | Component renders directly                                    |

## Migration Notes

- ✅ All existing widgets migrated
- ✅ No breaking changes to public API
- ✅ TypeScript compilation verified
- ✅ Backward compatible exports maintained

## Console Logs

The registry logs when widgets are registered (in development):

```
[WidgetRegistry] Registered widget component: metric
[WidgetRegistry] Registered widget component: info
[WidgetRegistry] Registered widget component: link
[WidgetRegistry] Registered widget component: status
[WidgetRegistry] Registered widget component: arcane
```

## File Size Comparison

- **Before**: 1 file, 248 lines
- **After**: 11 files, ~350 lines total (but much more organized)
- **Main index.tsx**: Reduced from 248 to 53 lines (78% reduction)

## Documentation

Each widget directory includes comprehensive README.md with:

- Architecture overview
- Step-by-step guides
- Code examples
- Design guidelines
- Best practices
