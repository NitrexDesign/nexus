.PHONY: help dev dev-backend dev-frontend build build-backend build-frontend migrate migrate-generate prod down logs lint format

# Project directories
FRONTEND_DIR := web
BACKEND_DIR := core
PROD_COMPOSE_FILE := docker-compose.prod.yml

# Default shell (use bash for trap support)
SHELL := /bin/bash

help:
	@echo "Makefile commands:"
	@echo "  dev                - Run backend + frontend for development (Ctrl-C to stop)"
	@echo "  dev-backend        - Run backend development server (bun)"
	@echo "  dev-frontend       - Run frontend development server (pnpm)"
	@echo "  build              - Build backend and frontend for production"
	@echo "  migrate            - Run database migrations (backend)"
	@echo "  migrate-generate   - Generate a new migration (backend)"
	@echo "  prod               - Start production stack via Docker Compose"
	@echo "  down               - Stop the production stack"
	@echo "  logs               - Follow production service logs"
	@echo "  lint               - Run linters (backend & frontend)"
	@echo "  format             - Run formatters (backend & frontend)"

## Development
dev-backend:
	@echo "==> Starting backend (in foreground)"
	@cd $(BACKEND_DIR) && bun run dev

dev-frontend:
	@echo "==> Starting frontend (in foreground)"
	@cd $(FRONTEND_DIR) && pnpm dev

# Runs both servers in parallel and traps Ctrl-C to stop both
dev:
	@echo "Starting backend and frontend (press Ctrl-C to stop)..."
	@cd $(BACKEND_DIR) && bun run dev & BK_PID=$$!; \
	cd $(CURDIR)/$(FRONTEND_DIR) && pnpm dev & FG_PID=$$!; \
	trap 'echo "Stopping servers..."; kill $$BK_PID $$FG_PID 2>/dev/null || true; exit' INT TERM; \
	wait $$BK_PID $$FG_PID

## Build & Packaging
build-backend:
	@echo "==> Building backend"
	@cd $(BACKEND_DIR) && bun run build

build-frontend:
	@echo "==> Building frontend"
	@cd $(FRONTEND_DIR) && pnpm build

build: build-backend build-frontend
	@echo "Build complete"

## Database
migrate:
	@echo "==> Running migrations"
	@cd $(BACKEND_DIR) && bun run db:migrate

migrate-generate:
	@echo "==> Generating migration (opens editor)"
	@cd $(BACKEND_DIR) && bun run db:generate

## Production (Docker Compose)
prod:
	@echo "==> Starting production stack (detached)"
	@docker compose -f $(PROD_COMPOSE_FILE) up -d

down:
	@echo "==> Bringing down production stack"
	@docker compose -f $(PROD_COMPOSE_FILE) down

logs:
	@echo "==> Following logs"
	@docker compose -f $(PROD_COMPOSE_FILE) logs -f

## Quality
lint:
	@echo "==> Running linters"
	@cd $(BACKEND_DIR) && bun run lint || true
	@cd $(FRONTEND_DIR) && pnpm lint || true

format:
	@echo "==> Running formatters"
	@cd $(BACKEND_DIR) && bun run format || true
	@cd $(FRONTEND_DIR) && pnpm format || true
