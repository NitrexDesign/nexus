# Service Widget Handlers

This directory contains modular service widget handlers that are automatically registered at runtime.

## Structure

- **`types.ts`**: Shared types and interfaces for all widget handlers
- **`registry.ts`**: Auto-registration system that discovers and registers widget handlers
- **`static.ts`**: Simple widgets that don't require data fetching (metric, info, link, status)
- **`arcane.ts`**: Arcane container stats widget with external API integration
- **Individual widget files**: Each complex widget type can have its own file

## Adding a New Widget Type

### Simple Widget (No Data Fetching)

For widgets that display static content from the database:

1. Add to `static.ts`:

```typescript
export const myWidget: WidgetHandler = {
  type: "my-widget",
};
```

2. Register in `registry.ts`:

```typescript
widgetRegistry.register(myWidget);
```

### Complex Widget (With Data Fetching)

For widgets that need to fetch external data:

1. Create `core/src/api/service-widgets/my-widget.ts`:

```typescript
import { WidgetHandler, getErrorMessage } from "./types";

export const myWidget: WidgetHandler = {
  type: "my-widget",
  fetchData: async (settings: Record<string, any>) => {
    const { apiUrl, apiKey } = settings;

    if (!apiUrl || !apiKey) {
      return {
        error: "Missing configuration",
        data: null,
      };
    }

    try {
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("[My Widget] Error fetching data:", error);
      return {
        error: getErrorMessage(error),
        data: null,
      };
    }
  },
};
```

2. Import and register in `registry.ts`:

```typescript
import { myWidget } from "./my-widget";
widgetRegistry.register(myWidget);
```

## Frontend Component

After adding a backend handler, create the corresponding React component in `web/src/components/service-widgets/`:

1. Create `web/src/components/service-widgets/MyWidget.tsx`
2. Add the widget case to the renderer in `index.tsx`
3. Export from `index.ts`

## Widget Handler Interface

```typescript
interface WidgetHandler {
  type: string;
  fetchData?: (settings: Record<string, any>) => Promise<Record<string, any>>;
}
```

### Properties

- **`type`**: Unique identifier for the widget type
- **`fetchData`**: Optional async function to fetch external data
  - Receives widget settings from the database
  - Returns data to merge into widget content
  - Should handle errors gracefully

### Settings

Widget settings are stored in the database and passed to `fetchData()`. Use settings for:

- API endpoints
- Authentication tokens
- Configuration options
- Feature flags

## Examples

- **Static Widgets**: `metric`, `info`, `link`, `status` - No data fetching
- **Dynamic Widgets**: `arcane` - Fetches container stats from external API

## Best Practices

1. **Error Handling**: Always catch errors and return safe defaults
2. **Validation**: Validate required settings before making requests
3. **Logging**: Use consistent log prefixes like `[Widget Name]`
4. **Performance**: Consider caching for expensive operations
5. **Security**: Never expose sensitive data in error messages
