# Nexus Embed Feature

A complete system for creating embeddable widgets that can be integrated into external websites.

## Overview

The embed feature allows you to create customizable widgets that display your Nexus service data on any website. Widgets are secured with API keys and support multiple display types (status, uptime, metrics).

## Architecture

### Backend Components

#### 1. Database Schema ([core/src/db/schema.ts](core/src/db/schema.ts))

- **`embedConfigs` table**: Stores embed configurations with API keys, allowed origins, refresh intervals, and settings
- **Relations**: Each embed config is linked to a user with cascade delete

#### 2. API Key Authentication ([core/src/auth/api-keys.ts](core/src/auth/api-keys.ts))

- **Key Generation**: Creates secure API keys with `nx_` prefix
- **Hash Storage**: Uses bcrypt to securely store API key hashes
- **Middleware**: `validateEmbedApiKey` validates API keys from Bearer tokens or query params
- **Origin Validation**: Supports wildcard patterns for allowed origins
- **Admin Middleware**: `requireAdmin` ensures only approved users can manage embeds

#### 3. Embed API Endpoints ([core/src/api/embeds.ts](core/src/api/embeds.ts))

**Admin Endpoints** (require authentication):

- `GET /api/embed/configs` - List all embed configs for authenticated user
- `POST /api/embed/configs` - Create new embed config (returns full API key once)
- `PUT /api/embed/configs/:id` - Update embed config
- `DELETE /api/embed/configs/:id` - Delete embed config
- `POST /api/embed/configs/:id/regenerate-key` - Generate new API key

**Public Endpoints** (require API key):

- `GET /api/embed/bulk` - Fetch all data for an embed (efficient bulk endpoint)
- `GET /api/embed/:id/data` - Fetch data for specific embed

**Widget Types**:

- **status**: Shows all public services with health status badges
- **uptime**: Displays uptime percentage for last 7 days per service
- **metrics**: Shows aggregate metrics (total, healthy, unhealthy, uptime %)

#### 4. Server Integration ([core/src/server.ts](core/src/server.ts))

Routes are registered with appropriate middleware for authentication and API key validation.

### Frontend Components

#### 1. Embed SDK ([web/public/embed.js](web/public/embed.js))

Vanilla JavaScript loader that:

- Auto-initializes from data attributes
- Fetches data from bulk endpoint
- Renders widgets based on type (status/uptime/metrics)
- Supports auto-refresh with configurable intervals
- Handles light/dark themes
- Injects isolated CSS styles
- Provides error handling with fallbacks

**Usage Example**:

```html
<div
  id="nexus-widget"
  data-api-key="nx_abc123..."
  data-server="https://nexus.example.com"
  data-theme="light"
  data-refresh="60"
></div>
<script src="https://nexus.example.com/embed.js"></script>
```

#### 2. Admin UI ([web/src/components/admin/EmbedManagement.tsx](web/src/components/admin/EmbedManagement.tsx))

React component with:

- Create/delete embed configurations
- Display API keys (masked after creation)
- Generate embed code snippets with copy button
- Regenerate API keys
- Configure refresh intervals and allowed origins
- Preview embed widgets

#### 3. Reusable Widget Components ([web/src/components/widgets/](web/src/components/widgets/))

- **EmbedWidget**: Base wrapper with loading/error states
- **StatusWidget**: Service status grid with icons and health badges
- **UptimeWidget**: Service uptime percentages with progress bars
- **MetricsWidget**: System-wide metrics in card grid layout

All widgets support:

- Light/dark themes
- Configurable grid layouts
- Loading skeletons
- Error boundaries
- Data prop injection or independent fetching

## Security Features

1. **API Key Authentication**: All embed endpoints require valid API keys
2. **Origin Validation**: Optional allowlist with wildcard support (`*.example.com`, `*`)
3. **Public Data Only**: Embeds only expose services marked as `public: true`
4. **Bcrypt Hashing**: API keys are hashed before storage
5. **One-Time Display**: Full API keys shown only on creation/regeneration
6. **CORS Headers**: Already configured for cross-origin requests

## Usage Workflow

### Creating an Embed

1. Navigate to Admin Dashboard → Embeds tab
2. Click "Create Embed"
3. Configure:
   - Name (internal reference)
   - Widget Type (status/uptime/metrics)
   - Refresh Interval (seconds)
   - Allowed Origins (optional, comma-separated)
   - Public visibility flag
4. Save and **copy the API key immediately** (shown only once)

### Integrating on External Site

1. Copy the generated embed code from the admin UI
2. Paste into your HTML `<body>` section
3. Customize:
   - `data-theme`: "light" or "dark"
   - `data-refresh`: Custom interval in seconds
   - Container styling via CSS

### Managing Embeds

- **View**: See all embeds with masked API keys
- **Regenerate Key**: Invalidates old key, generates new one
- **Delete**: Removes embed config and invalidates API key
- **Export Code**: Copy embed snippet at any time

## Configuration Options

### Embed Config Fields

| Field             | Type     | Description                                    |
| ----------------- | -------- | ---------------------------------------------- |
| `name`            | string   | Display name for internal use                  |
| `type`            | string   | Widget type: "status", "uptime", "metrics"     |
| `apiKey`          | string   | Unique API key (auto-generated)                |
| `allowedOrigins`  | string[] | Whitelist of allowed domains/patterns          |
| `refreshInterval` | number   | Auto-refresh interval in seconds (default: 60) |
| `settings`        | object   | JSON settings for customization                |
| `isPublic`        | boolean  | Whether embed is active                        |

### Embed SDK Data Attributes

| Attribute       | Required | Description                             |
| --------------- | -------- | --------------------------------------- |
| `data-api-key`  | ✓        | Your API key from admin panel           |
| `data-server`   |          | Server URL (defaults to current origin) |
| `data-embed-id` |          | Specific embed ID (optional)            |
| `data-theme`    |          | "light" or "dark" (default: "light")    |
| `data-refresh`  |          | Custom refresh interval in seconds      |

## Performance Considerations

1. **Bulk Endpoint**: `/api/embed/bulk` fetches all data in one request
2. **Public Flag Filtering**: Only services marked `public: true` are returned
3. **ClickHouse Graceful Degradation**: Uptime queries fail gracefully if CH unavailable
4. **CSS Injection**: Styles injected once per page load
5. **Auto-refresh**: Configurable per embed to reduce server load

## Future Enhancements

### Potential Improvements

1. **Rate Limiting**: Add Redis-backed rate limiting per API key
2. **Caching**: Cache bulk endpoint responses (1-minute TTL)
3. **Custom Templates**: Allow users to define custom widget HTML/CSS
4. **Webhook Notifications**: Alert on service status changes
5. **Analytics**: Track embed usage per API key
6. **Service Filtering**: Allow embeds to display specific service subsets
7. **Custom Data Endpoints**: Support user-defined data sources

### Known Limitations

1. **Session-based Admin Auth**: Currently uses simplified header auth (replace with proper session middleware)
2. **No Rate Limiting**: Embeds can be called unlimited times
3. **No Usage Analytics**: No tracking of embed impressions
4. **No Custom Styling**: Widget appearance is fixed (could add theme settings)
5. **Origin Validation**: Simple pattern matching (could use proper URL parsing)

## Migration

The embed feature adds one new table:

```sql
-- Created by migration: drizzle/0001_rare_lionheart.sql
CREATE TABLE embed_configs (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  api_key_hash VARCHAR(255) NOT NULL,
  allowed_origins JSON,
  data_endpoint VARCHAR(255),
  refresh_interval INT DEFAULT 60,
  settings JSON,
  is_public BOOLEAN DEFAULT TRUE,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

To apply: `cd core && bun run db:migrate`

## Testing

### Backend Testing

```bash
# Start dev server
make dev-backend

# Test embed creation (replace with real user ID)
curl -X POST http://localhost:8080/api/embed/configs \
  -H "Content-Type: application/json" \
  -H "X-User-Id: your-user-id" \
  -d '{"name":"Test","type":"status","refreshInterval":60}'

# Test bulk endpoint (replace with API key from above)
curl -H "Authorization: Bearer nx_..." \
  http://localhost:8080/api/embed/bulk
```

### Frontend Testing

1. Build frontend: `cd web && pnpm build`
2. Navigate to Admin Dashboard → Embeds
3. Create test embed
4. Open browser console, test embed.js on separate HTML page

### Integration Testing

Create `test.html`:

```html
<!DOCTYPE html>
<html>
  <head>
    <title>Embed Test</title>
  </head>
  <body>
    <h1>Nexus Embed Test</h1>
    <div
      data-api-key="nx_your_key_here"
      data-server="http://localhost:8080"
      data-theme="light"
    ></div>
    <script src="http://localhost:8080/embed.js"></script>
  </body>
</html>
```

Open in browser to verify rendering.

## Troubleshooting

### Common Issues

**"API key required" error**:

- Verify `data-api-key` attribute is set
- Check API key is valid (not regenerated/deleted)
- Ensure Authorization header or query param is present

**"Origin not allowed" error**:

- Add your domain to `allowedOrigins` in embed config
- Use `*` to allow all origins (not recommended for production)
- Verify origin header is being sent by browser

**No data displayed**:

- Check services are marked `public: true`
- Verify health checker is running
- Check browser console for JavaScript errors
- Ensure server URL is accessible from client

**Styles not applying**:

- Clear browser cache
- Check for CSS conflicts with parent site
- Verify `nexus-embed-styles` is injected in `<head>`

## Support

For issues or feature requests, please check:

- GitHub Issues: [your-repo/issues]
- Documentation: [your-docs-url]
- Discord/Community: [your-community-link]
