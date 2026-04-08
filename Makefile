.PHONY: up down build logs dev dev-build prod prod-build

# ── Development (uses docker-compose.override.yml automatically) ──
dev:
	docker compose up

dev-build:
	docker compose up --build

dev-build-migrate:
	docker compose up --build --wait
	make run-migrations

# ── Production (skips override, uses prod compose) ──
prod:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up

prod-build:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build

prod-build-migrate:
	docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build --wait
	make run-migrations-deploy

# ── Legacy aliases ──
up: dev
up-build: dev-build

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

# ── Database ──
run-migrations:
	docker compose exec backend npx prisma migrate dev

run-migrations-deploy:
	docker compose exec backend npx prisma migrate deploy

# Mark a migration as applied (adds row into _prisma_migrations table in db)
# docker compose exec backend npx prisma migrate resolve --applied name_of_migration

run-seed:
	docker compose exec backend npx tsx prisma/seed.ts

# ── Demo database ─────────────────────────────────────────────────────────────
# Isolated PostgreSQL instance on port 5433 pre-loaded with realistic SMB data.
# See docs/DEMO_DATABASE.md for full instructions.

DEMO_DB_URL = postgres://postgres:postgres@localhost:5433/ledgerlight_demo?sslmode=disable
DEMO_DB_URL_DOCKER = postgres://postgres:postgres@host.docker.internal:5433/ledgerlight_demo?sslmode=disable
DEMO_COMPOSE = docker compose -f docker-compose.demo.yml

demo-up:
	$(DEMO_COMPOSE) up -d

demo-up-build:
	$(DEMO_COMPOSE) up -d --build

demo-down:
	$(DEMO_COMPOSE) down

demo-destroy:
	$(DEMO_COMPOSE) down -v

demo-migrate:
	cd backend && DATABASE_URL="$(DEMO_DB_URL)" npx prisma migrate deploy

demo-seed:
	cd backend && DATABASE_URL="$(DEMO_DB_URL)" npx tsx prisma/seed.demo.ts

demo-reset: demo-destroy demo-up
	@echo "Waiting for db_demo to be ready..."
	@sleep 6
	$(MAKE) demo-migrate
	$(MAKE) demo-seed

# Switch DATABASE_URL in .env to point at the demo database (port 5433).
# The backend runs in Docker, so it must use host.docker.internal instead of localhost.
# After switching, restart the backend: docker compose restart backend
use-demo:
	@sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL=$(DEMO_DB_URL_DOCKER)|' .env
	@echo "Switched to demo database (port 5433)."
	@echo "Restart backend with: docker compose restart backend"

# Switch DATABASE_URL in .env back to the local dev database.
use-dev:
	@sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL=postgres://postgres:postgres@db:5432/ledgerlight?sslmode=disable|' .env
	@echo "Switched to dev database."
	@echo "Restart backend with: docker compose restart backend"



switch-demo: use-demo
	docker compose restart backend

switch-dev: use-dev
	docker compose restart backend
