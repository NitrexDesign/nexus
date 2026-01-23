# Nexus Core - TypeScript Backend

TypeScript rewrite of the Nexus backend using Bun runtime and Drizzle ORM. This implementation maintains full API compatibility with the Go backend while providing enhanced type safety and developer experience.

## Features

- 🚀 **Bun Runtime** - Fast, modern JavaScript runtime with built-in TypeScript support
- 🗄️ **Drizzle ORM** - Type-safe database operations with MySQL
- 🔐 **WebAuthn/Passkeys** - Full WebAuthn implementation for passwordless authentication
- 📊 **ClickHouse** - High-performance metrics storage and aggregation
- 🏥 **Health Checking** - Automated service monitoring with worker pool
- 🎨 **Icon Management** - Upload, download, and scrape icons from URLs
- 🔄 **API Parity** - 100% compatible with existing frontend

## Architecture

```
core/
├── src/
│   ├── api/          # REST API handlers
│   │   ├── services.ts
│   │   ├── icons.ts
│   │   ├── users.ts
│   │   └── widgets.ts
│   ├── auth/         # Authentication system
│   │   ├── webauthn.ts
│   │   ├── password.ts
│   │   └── handlers.ts
│   ├── db/           # Database layer
│   │   ├── schema.ts      # Drizzle schema definitions
│   │   ├── mysql.ts       # MySQL connection & pooling
│   │   ├── clickhouse.ts  # ClickHouse client
│   │   └── task-queue.ts  # Write serialization
│   ├── health/       # Health checking system
│   │   └── checker.ts
│   ├── models/       # TypeScript types
│   │   └── types.ts
│   ├── utils/        # Utilities
│   │   └── id.ts
│   ├── config.ts     # Environment configuration
│   └── server.ts     # Main entry point
├── package.json
├── tsconfig.json
└── drizzle.config.ts
```

## API Endpoints

### Authentication

- `POST /api/auth/register/password` - Register with username/password
- `POST /api/auth/login/password` - Login with password
- `GET /api/auth/register/webauthn/start` - Start WebAuthn registration
- `POST /api/auth/register/webauthn/finish` - Complete WebAuthn registration
- `GET /api/auth/login/webauthn/start` - Start WebAuthn login
- `POST /api/auth/login/webauthn/finish` - Complete WebAuthn login

### Services

- `GET /api/services` - List all services
- `POST /api/services` - Create service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service
- `POST /api/services/import` - Bulk import services
- `GET /api/services/groups` - Get distinct groups
- `GET /api/services/:id/uptime` - Get uptime history for service
- `GET /api/services/uptime` - Get uptime history for all services

### Icons

- `GET /api/icons/search?url=...` - Search for icons in webpage
- `POST /api/icons/download` - Download icon from URL
- `POST /api/icons/upload` - Upload icon file

### Users

- `GET /api/users` - List all users
- `PUT /api/users/:id/approve` - Approve/unapprove user
- `DELETE /api/users/:id` - Delete user

### Widgets

- `GET /api/widgets/settings` - Get widget settings
- `PUT /api/widgets/settings` - Update widget settings
- `GET /api/widgets/settings/category-order` - Get category order
- `PUT /api/widgets/settings/category-order` - Update category order
- `GET /api/widgets` - List all widget configs
- `POST /api/widgets` - Create widget config
- `GET /api/widgets/:id` - Get single widget config
- `PUT /api/widgets/:id` - Update widget config
- `DELETE /api/widgets/:id` - Delete widget config

## Development

### Prerequisites

- Bun v1.3.6 or later
- MySQL 8.0 or later
- ClickHouse (optional)

### Setup

```bash
# Install dependencies
cd core
bun install

# Configure environment (use parent .env or create core/.env)
# Required variables:
#   DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
#   WEBAUTHN_RP_NAME, WEBAUTHN_RP_ID, WEBAUTHN_RP_ORIGIN
#   API_PORT (default: 8082)

# Run in development mode (with hot reload)
bun run dev

# Build for production
bun run build

# Run production build
bun run start

# Lint code
bun run lint         # Check for issues
bun run lint:fix     # Auto-fix issues
```

### Using Make

```bash
# From project root
make dev-core        # Start TypeScript backend
make build-core      # Build for production
```

### Code Quality

The project uses ESLint with TypeScript support for code quality:

```bash
bun run lint         # Check for linting issues
bun run lint:fix     # Automatically fix fixable issues
```

ESLint is configured with:

- TypeScript ESLint plugin
- Recommended TypeScript rules
- Custom rules for error handling and unused variables

### Database Migrations

The TypeScript backend uses the existing Go migrations from `db/migrations/`. Migrations run automatically on server startup, or you can use the Go migration tool:

```bash
make migrate         # Run migrations
make migrate-status  # Check status
```

## Docker

### Development

```bash
# Start with Docker Compose profile
docker compose --profile core up -d

# Access TypeScript backend at http://localhost:8082
# Go backend remains at http://localhost:8080
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d core
```

## Configuration

All configuration is loaded from environment variables:

| Variable                | Default                     | Description                       |
| ----------------------- | --------------------------- | --------------------------------- |
| `API_PORT`              | `8082`                      | HTTP server port                  |
| `DB_HOST`               | `localhost`                 | MySQL host                        |
| `DB_PORT`               | `3306`                      | MySQL port                        |
| `DB_USER`               | `nexus`                     | MySQL username                    |
| `DB_PASSWORD`           | `nexus_password`            | MySQL password                    |
| `DB_NAME`               | `nexus`                     | MySQL database name               |
| `DB_CONNECT_RETRIES`    | `30`                        | Max connection retry attempts     |
| `DB_CONNECT_DELAY`      | `5000`                      | Delay between retries (ms)        |
| `CLICKHOUSE_HOST`       | -                           | ClickHouse host (optional)        |
| `CLICKHOUSE_PORT`       | `8123`                      | ClickHouse HTTP port              |
| `CLICKHOUSE_DB`         | `nexus`                     | ClickHouse database               |
| `CLICKHOUSE_USER`       | `default`                   | ClickHouse username               |
| `CLICKHOUSE_PASSWORD`   | -                           | ClickHouse password               |
| `WEBAUTHN_RP_NAME`      | `Nexus`                     | Relying Party name                |
| `WEBAUTHN_RP_ID`        | `localhost`                 | Relying Party ID                  |
| `WEBAUTHN_RP_ORIGIN`    | `http://localhost:5173,...` | Allowed origins (comma-separated) |
| `HEALTH_CHECK_INTERVAL` | `5`                         | Health check interval (minutes)   |
| `ICONS_DIR`             | `../data/icons`             | Icons directory path              |
| `WEB_DIST_DIR`          | `../web/dist`               | Frontend build directory          |

## Key Implementation Details

### Write Serialization

All database writes go through a task queue to prevent race conditions:

```typescript
await runTask(async () => {
  await db.insert(services).values(newService);
});
```

### Health Checking

- Worker pool with 5 concurrent workers
- Job queue with 100-item capacity
- 10-second HTTP timeout per check
- Status: online (200-399), offline (errors or 400+)
- Results logged to MySQL and ClickHouse

### WebAuthn Sessions

- In-memory session storage (ephemeral)
- Sessions deleted after registration/login completion
- Not persisted across server restarts

### Static File Serving

- Frontend served from `web/dist/`
- Icons served from `data/icons/` at `/icons/*` route
- SPA fallback returns `index.html` for unmatched routes

## Differences from Go Backend

1. **Port**: Runs on 8082 by default (vs 8081 for Go)
2. **Runtime**: Uses Bun instead of Go runtime
3. **ORM**: Uses Drizzle instead of raw SQL
4. **Type Safety**: Full TypeScript type checking throughout
5. **Static Serving**: Uses Bun/Hono's native static file handling

## Testing

Both backends can run simultaneously for comparison:

- Go backend: `http://localhost:8080`
- TypeScript backend: `http://localhost:8082`

Point your frontend to either backend by changing `nexus_server_url` in localStorage.

## Production Considerations

- [ ] Add session management (currently in-memory WebAuthn sessions)
- [ ] Add authentication middleware for protected routes
- [ ] Consider Redis for session storage
- [ ] Add rate limiting
- [ ] Add request validation
- [ ] Add comprehensive error handling
- [ ] Add observability (logging, metrics, tracing)
- [ ] Add tests (unit, integration, e2e)

## License

Same as parent project.
