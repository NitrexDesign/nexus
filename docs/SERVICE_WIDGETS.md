# Service Widgets Feature

## Overview

The service widgets feature allows you to add customizable information cards to any service displayed on your public dashboard. These widgets appear inside service cards and can display metrics, status badges, helpful links, and additional information.

## Widget Types

### 1. **Metric Widget**
Display key performance indicators or statistics.
- **Value**: The numeric or text value to display
- **Unit**: Optional unit (e.g., "ms", "%", "MB", "req/s")
- **Example**: Response time: 45ms

### 2. **Info Widget**
Display helpful text or descriptions.
- **Description**: Markdown-style text content
- **Example**: Service maintenance window, usage notes, documentation snippets

### 3. **Link Widget**
Add quick access buttons to related resources.
- **URL**: Target destination
- **Link Text**: Button label
- **Example**: "View Documentation", "API Status", "Support Portal"

### 4. **Status Badge**
Display custom status information with color-coded badges.
- **Status**: success, warning, error, or info
- **Message**: Status text to display
- **Example**: "Maintenance Mode", "Beta", "Production Ready"

## How to Add Widgets

### Admin Interface

1. Navigate to the Admin Dashboard (`/admin`)
2. Find the service card you want to add widgets to
3. Click the **"Widgets"** button on the service card
4. In the dialog that opens:
   - Select a **Widget Type** from the dropdown
   - Enter a **Title** for the widget
   - Fill in the type-specific fields (value, URL, description, etc.)
   - Set the **Display Order** (lower numbers appear first)
   - Toggle **"Visible to public"** to show/hide on the public dashboard
5. Click **"Add Widget"** to save

### Managing Existing Widgets

In the same widget management dialog:
- **Edit**: Click the edit icon to modify a widget
- **Toggle Visibility**: Click the eye icon to show/hide without deleting
- **Delete**: Click the trash icon to remove permanently

## Public Display

Widgets appear at the bottom of each service card on the public dashboard:
- Widgets are sorted by their display order (ascending)
- Only visible widgets are shown to public users
- Widgets animate in with a subtle stagger effect
- Different widget types have distinct visual styles

## Technical Details

### Database Schema
```typescript
serviceWidgets {
  id: string (UUID)
  serviceId: string (FK to services)
  type: string (metric, info, link, status)
  title: string
  content: JSON (type-specific data)
  settings: JSON (reserved for future features)
  order: number
  isVisible: boolean
  createdAt: timestamp
  updatedAt: timestamp
}
```

### API Endpoints

**Public Endpoints:**
- `GET /api/services/:serviceId/widgets` - Get visible widgets for a service
- `GET /api/services/widgets/bulk?serviceIds=id1,id2` - Bulk fetch for multiple services

**Admin Endpoints** (requires `X-User-Id` header):
- `GET /api/services/widgets/admin/:serviceId` - Get all widgets (including hidden)
- `POST /api/services/:serviceId/widgets` - Create new widget
- `PUT /api/services/widgets/:id` - Update widget
- `DELETE /api/services/widgets/:id` - Delete widget

### Performance

- The public dashboard uses a **bulk fetch endpoint** to load all widgets for all services in a single request
- Widgets are cached by React Query with smart invalidation
- No N+1 query problems - efficient database queries with joins

## Example Use Cases

1. **API Services**: Show response time metrics, rate limit info, and API documentation links
2. **Web Applications**: Display uptime percentage, current version, and changelog links
3. **Database Services**: Show connection count, storage usage, backup status
4. **CI/CD Tools**: Display build status, last deployment time, pipeline links
5. **Monitoring Services**: Show alert count, incident history links

## Future Enhancements

Potential features for future versions:
- Chart widgets with sparklines or mini graphs
- Real-time data widgets (auto-refresh from API)
- Widget templates for common use cases
- Conditional visibility (show/hide based on user roles)
- Widget positioning (above service info, sidebar, etc.)
