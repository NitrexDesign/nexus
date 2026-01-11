.PHONY: dev-backend dev-frontend dev help prod up down migrate migrate-status migrate-down

help:
	@echo "Nexus Development Commands:"
	@echo "  make dev              - Start both backend and frontend in development mode"
	@echo "  make dev-backend      - Start the Go backend"
	@echo "  make dev-frontend     - Start the React frontend"
	@echo "  make prod             - Start production services using pre-built images"
	@echo "  make up               - Start production services"
	@echo "  make down             - Stop production services"
	@echo ""
	@echo "Database Migration Commands:"
	@echo "  make migrate          - Run all pending database migrations"
	@echo "  make migrate-status   - Show migration status"
	@echo "  make migrate-down     - Rollback the last migration"
	@echo "                         (Create .env file or set DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME environment variables)"

dev-backend:
	@echo "Starting Go backend with Air..."
	@if command -v air > /dev/null; then \
		air; \
	else \
		echo "Air not found, falling back to go run..."; \
		go run cmd/server/main.go; \
	fi

dev-frontend:
	@echo "Starting React frontend..."
	cd web && pnpm dev

dev:
	@echo "Starting Nexus in development mode..."
	mkdir -p data
	(make dev-backend & make dev-frontend)

prod:
	@echo "Starting Nexus in production mode..."
	docker compose -f docker-compose.prod.yml pull
	docker compose -f docker-compose.prod.yml up -d

up:
	docker compose -f docker-compose.prod.yml up -d

down:
	docker compose -f docker-compose.prod.yml down

migrate:
	@echo "Running database migrations..."
	@bash -c 'if [ -f ".env" ]; then set -a && source .env && set +a; fi; \
	if [ -z "$$DB_USER" ] || [ -z "$$DB_PASSWORD" ] || [ -z "$$DB_HOST" ] || [ -z "$$DB_PORT" ] || [ -z "$$DB_NAME" ]; then \
		echo "Error: Database environment variables are required:"; \
		echo "  DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME"; \
		echo "Create a .env file with these variables or set them manually."; \
		echo "Example:"; \
		echo "  DB_USER=nexus DB_PASSWORD=nexus_password DB_HOST=localhost DB_PORT=3306 DB_NAME=nexus make migrate"; \
		exit 1; \
	fi; \
	DB_DSN="$$DB_USER:$$DB_PASSWORD@tcp($$DB_HOST:$$DB_PORT)/$$DB_NAME?multiStatements=true" exec go run scripts/migrate.go "$$DB_DSN" up'

migrate-status:
	@echo "Checking migration status..."
	@bash -c 'if [ -f ".env" ]; then set -a && source .env && set +a; fi; \
	if [ -z "$$DB_USER" ] || [ -z "$$DB_PASSWORD" ] || [ -z "$$DB_HOST" ] || [ -z "$$DB_PORT" ] || [ -z "$$DB_NAME" ]; then \
		echo "Error: Database environment variables are required:"; \
		echo "  DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME"; \
		echo "Create a .env file with these variables or set them manually."; \
		echo "Example:"; \
		echo "  DB_USER=nexus DB_PASSWORD=nexus_password DB_HOST=localhost DB_PORT=3306 DB_NAME=nexus make migrate-status"; \
		exit 1; \
	fi; \
	DB_DSN="$$DB_USER:$$DB_PASSWORD@tcp($$DB_HOST:$$DB_PORT)/$$DB_NAME?multiStatements=true" exec go run scripts/migrate.go "$$DB_DSN" status'

migrate-down:
	@echo "Rolling back last migration..."
	@bash -c 'if [ -f ".env" ]; then set -a && source .env && set +a; fi; \
	if [ -z "$$DB_USER" ] || [ -z "$$DB_PASSWORD" ] || [ -z "$$DB_HOST" ] || [ -z "$$DB_PORT" ] || [ -z "$$DB_NAME" ]; then \
		echo "Error: Database environment variables are required:"; \
		echo "  DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME"; \
		echo "Create a .env file with these variables or set them manually."; \
		echo "Example:"; \
		echo "  DB_USER=nexus DB_PASSWORD=nexus_password DB_HOST=localhost DB_PORT=3306 DB_NAME=nexus make migrate-down"; \
		exit 1; \
	fi; \
	DB_DSN="$$DB_USER:$$DB_PASSWORD@tcp($$DB_HOST:$$DB_PORT)/$$DB_NAME?multiStatements=true" exec go run scripts/migrate.go "$$DB_DSN" down'
