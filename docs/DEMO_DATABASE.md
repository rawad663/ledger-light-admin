# Demo Database

## Overview

The demo database is an isolated PostgreSQL instance pre-loaded with realistic, production-volume SMB data. It is designed for:

- **Demo purposes** — walk stakeholders through a fully-populated UI without touching real data
- **Performance testing** — benchmark queries, pagination, and API endpoints under realistic load

The database lives entirely in its own Docker volume (`db_demo_data`) and Docker service (`db_demo`). It shares the same schema as the dev database and is completely independent — you can run both simultaneously.

---

## Data Summary

| Entity | Approx. Count |
|---|---|
| Organizations | ~120 |
| Users | ~1,500 |
| Memberships | ~1,500 |
| Locations | ~600 |
| Products | ~55,000 |
| Customers | ~60,000 |
| Inventory Levels | ~55,000 |
| Inventory Adjustments | ~55,000 |
| Orders | ~1.2M |
| Order Items | ~2.4M |

Data spans a 2-year history with a realistic seasonal Q4 (Oct–Dec) order bias. Order status distribution: 70% Fulfilled, 10% Pending, 10% Confirmed, 7% Cancelled, 3% Refunded.

---

## Business Types Included

The 120 organizations are randomly distributed across 9 SMB business types:

| Code | Type | Typical Products |
|---|---|---|
| APP | Retail Apparel | Clothing, footwear, accessories |
| CAF | Coffee / Café | Beverages, food, retail beans, merchandise |
| BKS | Bookstore | Books by genre, stationery |
| ELX | Electronics Accessories | Cables, audio, chargers, storage |
| HLT | Health & Beauty | Skincare, haircare, supplements, fragrance |
| SPT | Sporting Goods | Footwear, apparel, equipment, nutrition |
| HOM | Home Goods | Kitchen, bedding, storage, décor |
| PET | Pet Supplies | Food, toys, grooming, health accessories |
| GRO | Grocery / Market | Produce, bakery, dairy, snacks, beverages |

Org sizes follow an SMB normal distribution: ~70% small (2–4 locations), ~25% medium (5–9 locations), ~5% larger (10–15 locations).

---

## Demo Credentials

All demo users share the same password:

```
Password: DemoPass123!
```

User emails follow the pattern `firstname.lastnameN@orgslug.demo`. You can find any owner's email by looking up a membership with role `OWNER` for a given organization in the database.

---

## Prerequisites

- Docker and Docker Compose (for `db_demo`)
- Node.js ≥ 20 and npm (for running migrations and seed from the host)
- The `backend/` directory's `node_modules` must be installed (`cd backend && npm install`)

---

## Quick Start

### 1. Start the demo database

```bash
make demo-up
```

This starts a PostgreSQL 16 container (`ledgerlight_db_demo`) on **port 5433**. It does not affect the dev database on port 5432.

### 2. Run migrations

```bash
make demo-migrate
```

This runs `prisma migrate deploy` against the demo database, bringing its schema up to date.

### 3. Seed the data

```bash
make demo-seed
```

This runs `backend/prisma/seed.demo.ts` against the demo database. Expect **20–35 minutes** depending on your machine. Progress is logged every batch with elapsed time.

> **Tip:** You can combine all three steps with `make demo-reset` on a clean database.

---

## Switching Between Databases

The backend application reads its database URL from `DATABASE_URL` in `.env`. To switch:

### Switch to demo database

```bash
make use-demo
docker compose restart backend
```

This rewrites `DATABASE_URL` in `.env` to `postgres://postgres:postgres@localhost:5433/ledgerlight_demo?sslmode=disable` and prompts you to restart the backend container.

Because the backend itself runs inside Docker, the container cannot use `localhost` to reach the demo database on your host. For the containerized backend, use:

`postgres://postgres:postgres@host.docker.internal:5433/ledgerlight_demo?sslmode=disable`

`make use-demo` now writes that Docker-safe URL into `.env`.

### Switch back to dev database

```bash
make use-dev
docker compose restart backend
```

This restores `DATABASE_URL` to the original dev connection string (`@db:5432/ledgerlight`).

> **Note:** `make use-demo` / `make use-dev` use `sed` to edit `.env` in-place. A `.env.bak` backup is created automatically. If you need to revert manually, copy `.env.bak` back to `.env`.

---

## Reset and Rebuild

To wipe the demo database and reseed from scratch:

```bash
make demo-reset
```

This runs in sequence:
1. `make demo-destroy` — stops the container and deletes the `db_demo_data` volume
2. `make demo-up` — starts a fresh container
3. `make demo-migrate` — applies all migrations
4. `make demo-seed` — regenerates all data

> **Warning:** `make demo-destroy` is irreversible. All data in `db_demo_data` will be lost.

---

## Running Both Databases Simultaneously

The dev database (`db`) runs on port 5432 and the demo database (`db_demo`) runs on port 5433. They can run at the same time with no conflict.

```bash
# Start dev stack (existing flow)
make dev-build

# Start demo database alongside it
make demo-up
```

The backend app only connects to one at a time (whichever `DATABASE_URL` points to). Switching requires a backend restart.

---

## Running Individual Makefile Targets

| Command | Description |
|---|---|
| `make demo-up` | Start `db_demo` container in the background |
| `make demo-down` | Stop `db_demo` container (data is preserved) |
| `make demo-destroy` | Stop container and delete volume (data is lost) |
| `make demo-migrate` | Apply Prisma migrations to demo db |
| `make demo-seed` | Run the demo seed script |
| `make demo-reset` | Destroy + start fresh + migrate + seed |
| `make use-demo` | Point `DATABASE_URL` in `.env` at demo db |
| `make use-dev` | Point `DATABASE_URL` in `.env` at dev db |

---

## Performance Notes

- `db_demo` runs with `synchronous_commit=off` — this trades crash-recovery durability for ~3× bulk write throughput. This setting is intentional and safe for demo data. **Do not apply this flag to a production database.**
- The seed script uses raw PostgreSQL `INSERT ... VALUES (...)` with up to 4,000 rows per batch, bypassing Prisma's `createMany` for performance.
- Memory usage during seeding is bounded at ~5MB per batch; no large in-memory buffers are required.

---

## Direct Database Access

Connect directly to the demo database for inspection from your host machine:

```bash
psql postgres://postgres:postgres@localhost:5433/ledgerlight_demo
```

If you need the backend container to talk to the demo database, use:

```text
postgres://postgres:postgres@host.docker.internal:5433/ledgerlight_demo?sslmode=disable
```

Or from within a Docker network:

```bash
docker compose -f docker-compose.demo.yml exec db_demo psql -U postgres ledgerlight_demo
```

Verify row counts after seeding:

```sql
SELECT 'organizations' AS entity, COUNT(*) FROM "Organization"
UNION ALL SELECT 'users', COUNT(*) FROM "User"
UNION ALL SELECT 'orders', COUNT(*) FROM "Order"
UNION ALL SELECT 'order_items', COUNT(*) FROM "OrderItem"
UNION ALL SELECT 'products', COUNT(*) FROM "Product";
```
