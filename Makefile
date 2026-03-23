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
