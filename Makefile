# ============================================================
# Makefile — Developer convenience shortcuts
# Usage: make <target>
# Requires: Docker Desktop running, make installed (or use the commands directly)
# ============================================================

.PHONY: help up down build logs ps clean generate-keys setup migrate shell-auth shell-app shell-db test-auth

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: generate-keys ## First-time setup: generate keys and copy .env
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example — fill in real values"; fi

generate-keys: ## Generate RS256 JWT key pair and print base64 values
	@openssl genrsa -out /tmp/pp_private.pem 4096 2>/dev/null
	@openssl rsa -in /tmp/pp_private.pem -pubout -out /tmp/pp_public.pem 2>/dev/null
	@echo "=== JWT_PRIVATE_KEY_BASE64 ==="
	@base64 -w 0 /tmp/pp_private.pem
	@echo ""
	@echo "=== JWT_PUBLIC_KEY_BASE64 (use for both JWT_PUBLIC_KEY_BASE64 and JWT_PUBLIC_KEY_BASE64_APP) ==="
	@base64 -w 0 /tmp/pp_public.pem
	@echo ""
	@rm -f /tmp/pp_private.pem /tmp/pp_public.pem
	@echo "Keys deleted. Paste the values into your .env file."

up: ## Start all services
	docker compose up

up-build: ## Build and start all services
	docker compose up --build

down: ## Stop all services
	docker compose down

build: ## Build all Docker images without starting
	docker compose build

logs: ## Follow logs for all services
	docker compose logs -f

logs-auth: ## Follow Java auth service logs
	docker compose logs -f auth-service

logs-app: ## Follow Python app service logs
	docker compose logs -f app-service

logs-frontend: ## Follow Next.js frontend logs
	docker compose logs -f frontend

ps: ## Show running containers
	docker compose ps

migrate: ## Run Alembic migrations (app schema)
	docker compose exec app-service alembic upgrade head

shell-auth: ## Open shell in auth service container
	docker compose exec auth-service sh

shell-app: ## Open shell in app service container
	docker compose exec app-service bash

shell-db: ## Open PostgreSQL shell
	docker compose exec postgres psql -U $$POSTGRES_USER -d $$POSTGRES_DB

shell-redis: ## Open Redis CLI
	docker compose exec redis redis-cli -a $$REDIS_PASSWORD

clean: ## Remove all containers, volumes, and images for this project
	docker compose down -v --rmi local
	@echo "Warning: This removes all data volumes including the database."

test-auth: ## Run auth service tests
	docker compose exec auth-service mvn test

test-app: ## Run app service tests
	docker compose exec app-service python -m pytest

lint-frontend: ## Run frontend type check and lint
	docker compose exec frontend npm run type-check
	docker compose exec frontend npm run lint
