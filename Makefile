.PHONY: dev-backend dev-frontend dev help prod up down

help:
	@echo "Nexus Development Commands:"
	@echo "  make dev           - Start both backend and frontend in development mode"
	@echo "  make dev-backend   - Start the Go backend"
	@echo "  make dev-frontend  - Start the React frontend"
	@echo "  make prod          - Start production services using pre-built images"
	@echo "  make up            - Start production services"
	@echo "  make down          - Stop production services"

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
