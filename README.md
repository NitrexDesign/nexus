# Nexus 🚀

**Nexus** is a blazingly fast, modern homelab dashboard and service aggregator.

> [!IMPORTANT]
> This project is proudly **AI Slop**. It was built almost entirely by agentic AI, but **it does exactly what I need it to do.**

## ✨ Features

- ⚡ **Extremely Fast**: Built with a TypeScript (Bun) backend and a lightweight React frontend, it's designed to be snappy and efficient.
- 🔑 **Passkey Support**: Secure, passwordless authentication using WebAuthn/Passkeys. No more memorizing passwords for your dashboard.
- 🎨 **Premium Design**: Crafted with [shadcn/ui](https://ui.shadcn.com/) and Tailwind CSS for a state-of-the-art, premium aesthetic.
- 🛠️ **Service Management**: Easily add, group, and manage your homelab services with icon auto-discovery.
- 👥 **User Workflow**: Built-in administrator approval workflow for new registrations.
- 🐳 **Docker Ready**: Fully containerized and ready for deployment.
- 🧩 **Widget System**: Customizable dashboard widgets with persistent backend storage.
- 🌤️ **Weather Widget**: Real-time weather data with OpenWeatherMap and Met Office integration.

## 🛠 Tech Stack

- **Backend**: TypeScript (Bun, Hono, Drizzle ORM, MySQL, ClickHouse)
- **Frontend**: React, TypeScript, Vite
- **UI Components**: shadcn/ui, Lucide Icons, Sonner (toasts)
- **Styling**: Tailwind CSS

## 🚀 Quick Start

Ensure you have Docker and Docker Compose installed, then:

```bash
docker-compose up -d
```

Access the dashboard at `http://localhost:8080`.

## 🗃️ Database Migrations

Nexus uses a migration system to manage database schema changes. **Migrations are automatically run when the server starts**, ensuring your database schema is always up to date. You can also manage them manually if needed:

**Connection tuning:** When running the server in environments where the database may take longer to start (for example Docker), you can tune the connection behavior with environment variables:

- `DB_CONNECT_RETRIES` (default: `30`) — number of connection attempts before failing
- `DB_CONNECT_DELAY` (default: `5`) — number of seconds to wait between attempts

These are useful when your MySQL container starts slowly; increasing time/delay prevents the server from exiting early while the DB initializes.

### Troubleshooting connection errors

If you see logs like:

```
Failed to connect to database (attempt 1/30): dial tcp: lookup mysql: no such host
```

Then you are likely running the backend locally while your database is not accessible at the Docker service name `mysql`. Fixes:

- Start the MySQL container: `docker compose up -d mysql` (or `docker compose up -d`).
- Or point the server to a locally reachable host. Quick helpers:
  - Create a `.env` with `DB_HOST=127.0.0.1` (and other DB vars) manually, or run:

    ```bash
    make use-host-db    # creates a .env pointing to 127.0.0.1 (does not overwrite existing .env)
    make check-host-db  # runs a mysqladmin ping using .env credentials (requires mysqladmin client)
    ```

  - If you installed MySQL on your host, ensure the service is running (examples):
    - Debian/Ubuntu: `sudo systemctl start mysql`
    - Arch Linux: `sudo systemctl start mysqld`
    - Fedora/CentOS: `sudo systemctl start mariadb`

  - To create the `nexus` DB and user (run as a DB admin/root user):

    ```sql
    CREATE DATABASE nexus;
    CREATE USER 'nexus'@'localhost' IDENTIFIED BY 'nexus_password';
    GRANT ALL PRIVILEGES ON nexus.* TO 'nexus'@'localhost';
    FLUSH PRIVILEGES;
    ```

- For macOS/Windows Docker Desktop, you can use `host.docker.internal` from inside containers — if your server runs in a container and you want it to talk to a host DB, use that hostname.
- When running the server in Docker (the `server` service), the hostname `mysql` is correct and will resolve automatically.

### Using Make commands (recommended)

- Start development (with DB container bootstrap): `make dev-with-db` — starts MySQL & ClickHouse containers, waits for MySQL health, and then runs `make dev`.

### Running Migrations

Nexus uses **Drizzle ORM** for database migrations. Create a `.env` file in the `core/` directory with your database configuration:

```bash
DB_USER=nexus
DB_PASSWORD=nexus_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nexus
```

Then run the migration commands:

```bash
# Run all pending migrations
make migrate

# Generate new migrations from schema changes
make migrate-generate

# Open Drizzle Studio (database GUI)
make migrate-studio
```

Or use the core package scripts directly:

```bash
cd core
bun run db:migrate    # Run migrations
bun run db:generate   # Generate migrations
bun run db:studio     # Open Drizzle Studio
```

### Troubleshooting Migration Issues

If you encounter migration errors, you can:

1. Check the connection with Drizzle Studio: `make migrate-studio`
2. Reset the database and re-run migrations (destructive)
3. Manually inspect the `__drizzle_migrations` table in MySQL
   make migrate

````

The migration system automatically handles corrupted `schema_migrations` tables and will recreate them as needed.

## 🌤️ Weather Widget Setup

The weather widget requires an API key from [OpenWeatherMap](https://openweathermap.org/api). Set the `OPENWEATHER_API_KEY` environment variable:

```bash
export OPENWEATHER_API_KEY=your_api_key_here
````

## 🧩 Widget System

Nexus features a powerful, customizable widget system that allows you to personalize your dashboard with various widgets. The system uses a polymorphic backend storage approach for maximum flexibility.

### Available Widgets

- **📅 Date & Time**: Current date and time with timezone support
- **✅ Todo List**: Task management with persistent storage
- **🔍 Search**: Quick web search with multiple providers
- **🌤️ Weather**: Real-time weather data (see above)

### Technical Architecture

**Backend Storage:**

- **Polymorphic Settings**: Each widget stores its configuration as JSON in the database
- **RESTful API**: Full CRUD operations for widget management
- **Database Schema**: Separate tables for widget configurations and global settings

**Frontend Features:**

- **Drag & Drop**: Intuitive grid-based positioning system
- **Real-time Updates**: Changes sync immediately with the backend
- **Responsive Design**: Widgets adapt to different screen sizes
- **Category Organization**: Widgets grouped by functionality

**API Endpoints:**

- `GET/POST/PUT/DELETE /api/widgets/configs` - Widget configuration management
- `GET/PUT /api/widgets/category-order` - Widget category ordering

### Adding New Widgets

The system is designed for extensibility. To add a new widget:

1. **Register the Widget**: Add to the widget registry with type, settings, and component
2. **Backend Storage**: Settings are automatically stored as JSON
3. **API Integration**: No additional backend changes needed for new widget types

The polymorphic design means any widget can store arbitrary configuration data without schema changes.

## 📜 Why "AI Slop"?

This project serves as a testament to the speed and capability of modern AI coding agents. While the code might be "slop" in the sense that an AI generated the bulk of it, the result is a highly functional, secure, and beautiful tool that meets every requirement perfectly.

---

_Built with ❤️ (and high-speed LLMs)_

(this description is also AI generated)
