# Nexus 🚀

**Nexus** is a blazingly fast, modern homelab dashboard and service aggregator.

> [!IMPORTANT]
> This project is proudly **AI Slop**. It was built almost entirely by agentic AI, but **it does exactly what I need it to do.**

## ✨ Features

- ⚡ **Extremely Fast**: Built with a Go backend and a lightweight React frontend, it's designed to be snappy and efficient.
- 🔑 **Passkey Support**: Secure, passwordless authentication using WebAuthn/Passkeys. No more memorizing passwords for your dashboard.
- 🎨 **Premium Design**: Crafted with [shadcn/ui](https://ui.shadcn.com/) and Tailwind CSS for a state-of-the-art, premium aesthetic.
- 🛠️ **Service Management**: Easily add, group, and manage your homelab services with icon auto-discovery.
- 👥 **User Workflow**: Built-in administrator approval workflow for new registrations.
- 🐳 **Docker Ready**: Fully containerized and ready for deployment.
- 🧩 **Widget System**: Customizable dashboard widgets with persistent backend storage.
- 🌤️ **Weather Widget**: Real-time weather data with OpenWeatherMap and Met Office integration.

## 🛠 Tech Stack

- **Backend**: Go (Chi, WebAuthn, MySQL)
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

### Using Make commands (recommended)

Create a `.env` file in the project root with your database configuration:

```bash
DB_TYPE=mysql
DB_USER=nexus
DB_PASSWORD=nexus_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nexus
```

Then run the commands (they will automatically load the .env file):

```bash
# Run all pending migrations
make migrate

# Check migration status
make migrate-status

# Rollback the last migration
make migrate-down
```

Alternatively, set environment variables manually:

```bash
DB_USER=nexus DB_PASSWORD=nexus_password DB_HOST=localhost DB_PORT=3306 DB_NAME=nexus make migrate
```

### Using the migration script directly

```bash
# Run migrations
go run scripts/migrate.go "nexus:nexus_password@tcp(localhost:3306)/nexus?multiStatements=true" up

# Check status
go run scripts/migrate.go "nexus:nexus_password@tcp(localhost:3306)/nexus?multiStatements=true" status

# Show current version
go run scripts/migrate.go "nexus:nexus_password@tcp(localhost:3306)/nexus?multiStatements=true" version

# Rollback one migration
go run scripts/migrate.go "nexus:nexus_password@tcp(localhost:3306)/nexus?multiStatements=true" down

# Force version (fix dirty state)
go run scripts/migrate.go "nexus:nexus_password@tcp(localhost:3306)/nexus?multiStatements=true" force 1
```

### Troubleshooting Migration Issues

If you encounter migration errors related to the `schema_migrations` table, you can reset the migration state:

```bash
# Reset migration tracking (drops schema_migrations table)
mysql -h localhost -u nexus -p nexus < scripts/reset_migrations.sql

# Then run migrations again
make migrate
```

The migration system automatically handles corrupted `schema_migrations` tables and will recreate them as needed.

## 🌤️ Weather Widget Setup

The weather widget requires an API key from [OpenWeatherMap](https://openweathermap.org/api). Set the `OPENWEATHER_API_KEY` environment variable:

```bash
export OPENWEATHER_API_KEY=your_api_key_here
```

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
*Built with ❤️ (and high-speed LLMs)*

(this description is also AI generated)