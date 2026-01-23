.PHONY: dev-backend dev-frontend dev help prod up down migrate migrate-generate migrate-studio

help:
	@echo "Nexus Development Commands:"
	@echo "  make dev              - Start both backend and frontend in development mode"
	@echo "  make dev-backend      - Start the TypeScript (Bun) backend"
	@echo "  make dev-frontend     - Start the React frontend"
	@echo "  make build-backend    - Build the TypeScript backend"
	@echo "  make prod             - Start production services using pre-built images"
	@echo "  make up               - Start production services"
	@echo "  make down             - Stop production services"
	@echo ""
	@echo "Database Migration Commands:"
	@echo "  make migrate          - Run all pending database migrations (Drizzle)"
	@echo "  make migrate-generate - Generate new migrations from schema changes"
	@echo "  make migrate-studio   - Open Drizzle Studio (database GUI)"
	@echo "                         (Create .env file or set DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME environment variables)"

dev-backend:
	@echo "Starting TypeScript (Bun) backend..."
	cd core && bun run dev

build-backend:
	@echo "Building TypeScript backend..."
	cd core && bun run build

dev-frontend:
	@echo "Starting React frontend..."
	cd web && pnpm dev

dev:
	@echo "Starting Nexus in development mode..."
	@mkdir -p data
	@./scripts/dev.sh

# Start database containers for local development
.PHONY: dev-db wait-db dev-with-db

dev-db:
	@echo "Starting MySQL & ClickHouse containers..."
	docker compose up -d mysql clickhouse

wait-db:
	@echo "Waiting for MySQL to become healthy..."
	@i=0; until docker compose exec mysql mysqladmin ping -h localhost -uroot -proot_password >/dev/null 2>&1 || [ $$i -gt 60 ]; do i=$$((i+1)); sleep 1; echo "waiting for mysql... ($$i)"; done; if [ $$i -gt 60 ]; then echo "MySQL did not become healthy in time"; exit 1; fi

# Convenience target to start DB and start development servers
dev-with-db: dev-db wait-db dev
	@echo "Development environment started (with DB)"

# Create a .env file configured to use a local (host) MySQL installation
.PHONY: use-host-db check-host-db

check-host-db:
	@./scripts/check_local_mysql.sh

# Diagnose and attempt fixes for a local MariaDB installation
.PHONY: fix-local-db
fix-local-db:
	@echo "Running MariaDB diagnostic & helper (run with sudo if you want auto-fix actions)"
	@./scripts/fix_mariadb.sh

prod:
	@echo "Starting Nexus in production mode..."
	docker compose -f docker-compose.prod.yml pull
	docker compose -f docker-compose.prod.yml up -d

up:
	docker compose -f docker-compose.prod.yml up -d

down:
	docker compose -f docker-compose.prod.yml down

migrate:
	@echo "Running database migrations (Drizzle)..."
	@cd core && bun run db:migrate

migrate-generate:
	@echo "Generating migrations from schema..."
	@cd core && bun run db:generate

migrate-studio:
	@echo "Opening Drizzle Studio..."
	@cd core && bun run db:studio
