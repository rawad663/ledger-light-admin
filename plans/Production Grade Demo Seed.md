# Plan: Production-Grade Demo Seed Database

## Context

The current `seed.ts` is a small dev fixture (1 org, 3 users, 3 products, 100 customers). The goal is a separate, isolated database pre-loaded with realistic SMB POS data for demo and performance testing — without touching the dev database or any app code. Switching between databases is done by changing `DATABASE_URL` in `.env`.

Target volumes:
- ~120 organizations
- ~1,500 users
- ~600 locations
- ~55,000 products
- ~55,000 inventory levels
- ~60,000 customers
- ~1.2M orders + ~2.4M order items

---

## Files to Create / Modify

| File | Action |
|---|---|
| `docker-compose.demo.yml` | CREATE — standalone `db_demo` service on port 5433 |
| `backend/prisma/seed.demo.ts` | CREATE — high-performance bulk seed script |
| `docs/DEMO_DATABASE.md` | CREATE — switch instructions + data summary |
| `Makefile` | MODIFY — append `demo-*` targets |

**No changes** to `seed.ts`, `schema.prisma`, `docker-compose.yml`, or any app code.

---

## 1. `docker-compose.demo.yml`

Standalone file (not an override). Defines only `db_demo`:

```yaml
services:
  db_demo:
    image: postgres:16-alpine
    container_name: ledgerlight_db_demo
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: ledgerlight_demo
    ports:
      - "5433:5432"
    volumes:
      - db_demo_data:/var/lib/postgresql/data
    shm_size: '512mb'
    command: >
      postgres
        -c shared_buffers=256MB
        -c work_mem=64MB
        -c maintenance_work_mem=256MB
        -c synchronous_commit=off
        -c wal_buffers=16MB
        -c max_wal_size=2GB
        -c checkpoint_completion_target=0.9
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ledgerlight_demo"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  db_demo_data:
```

Key: `synchronous_commit=off` trades fsync durability for ~3× write throughput — acceptable for demo data.

---

## 2. Makefile Additions

Append after the existing `run-seed` target. Migrations and seed run from host using `cd backend && DATABASE_URL=... npx ...` — no backend container needed for the demo db:

```makefile
# ── Demo database ──
DEMO_DB_URL = postgres://postgres:postgres@localhost:5433/ledgerlight_demo?sslmode=disable
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
	sleep 5
	make demo-migrate
	make demo-seed

# ── Switch DATABASE_URL in .env ──
use-dev:
	@sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL=postgres://postgres:postgres@db:5432/ledgerlight?sslmode=disable|' .env
	@echo "Switched to dev database. Restart backend: docker compose restart backend"

use-demo:
	@sed -i.bak 's|^DATABASE_URL=.*|DATABASE_URL=$(DEMO_DB_URL)|' .env
	@echo "Switched to demo database (port 5433). Restart backend: docker compose restart backend"
```

---

## 3. `backend/prisma/seed.demo.ts` Architecture

Single file, ~800 lines. Sections in order:

### 3.1 Imports & Client

```typescript
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaClient } from './generated/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

### 3.2 Deterministic RNG (no external libraries)

Linear Congruential Generator seeded from `process.hrtime.bigint()`:

```typescript
let _seed = Number(process.hrtime.bigint() % BigInt(2 ** 32));
function rng(): number { /* LCG */ }
function rngInt(min, max): number { /* floor(rng() * range) + min */ }
function rngPick<T>(arr: T[]): T { /* arr[floor(rng() * arr.length)] */ }
function rngPickWeighted<T>(items: T[], weights: number[]): T { /* weighted selection */ }
```

### 3.3 Static Data Pools (hardcoded)

```typescript
const FIRST_NAMES = ['James','Maria','David','Sophie','Carlos','Aisha', ...38 more]
const LAST_NAMES = ['Smith','Johnson','Williams','Brown', ...38 more]
const COMPANY_PREFIXES = ['North','South','East','West','Highland','Valley', ...20 more]
const CANADIAN_CITIES = [
  { city: 'Toronto', province: 'ON', postalPrefix: 'M5' },
  { city: 'Vancouver', province: 'BC', postalPrefix: 'V6' },
  // ... 13 more cities
]
const STREET_NAMES = ['Main St','King St','Queen St','Yonge St', ...15 more]
```

### 3.4 Business Type Catalog (9 types)

Each defines: `orgNameSuffixes`, `categories`, `productCount.{min,max}`, `priceBands` per category, `productNamesByCategory`:

| Type | Categories | Avg Products |
|---|---|---|
| `retail_apparel` | Tops, Bottoms, Outerwear, Footwear, Accessories | 350 |
| `coffee_cafe` | Espresso, Brewed, Cold, Food, Retail Beans, Merch | 120 |
| `bookstore` | Fiction, Non-Fiction, Children, Science, Stationery | 550 |
| `electronics_accessories` | Cables, Audio, Phone Cases, Chargers, Keyboards | 275 |
| `health_beauty` | Skincare, Hair Care, Body, Cosmetics, Supplements | 350 |
| `sporting_goods` | Footwear, Apparel, Equipment, Nutrition, Recovery | 315 |
| `home_goods` | Kitchen, Bedding, Storage, Lighting, Décor, Bath | 400 |
| `pet_supplies` | Dog Food, Cat Food, Toys, Grooming, Health | 250 |
| `grocery` | Produce, Bakery, Dairy, Snacks, Beverages, Pantry | 600 |

SKU format: `{TYPE_CODE}-{CATEGORY_CODE}-{ZERO_PADDED_SEQ}` (e.g., `APP-TOP-0042`). Unique per org.

### 3.5 Org Tier Distribution

```typescript
const ORG_TIERS = [
  { label: 'small',  locationMin: 2, locationMax: 4,  userMin: 3,  userMax: 6,  customerMin: 200,  customerMax: 500,  weight: 70 },
  { label: 'medium', locationMin: 5, locationMax: 9,  userMin: 7,  userMax: 13, customerMin: 500,  customerMax: 1000, weight: 25 },
  { label: 'large',  locationMin: 10,locationMax: 15, userMin: 14, userMax: 20, customerMin: 1000, customerMax: 2000, weight: 5  },
];
```

120 orgs → ~84 small, ~30 medium, ~6 large → ~600 locations, ~1500 users, ~60K customers.

Order volume per location:
- small-org location: 1200–2000 orders
- medium-org location: 2000–3500 orders
- large-org location: 3500–5000 orders

Expected total: 84×3×1600 + 30×7×2750 + 6×12.5×4250 ≈ 403K + 577K + 319K = ~1.3M orders.

### 3.6 Bulk Insert Helper (performance-critical)

Uses `$executeRawUnsafe` with multi-row VALUES — Prisma's `createMany` is too slow for 1M+ rows:

```typescript
async function bulkInsert(
  table: string,
  columns: string[],
  rows: unknown[][],
  conflictTarget: string,   // e.g. '("id")' or '("organizationId","sku")'
  batchSize = 4000,
): Promise<void> {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const params: unknown[] = [];
    let pIdx = 1;
    const placeholders = batch.map(row => {
      const slots = row.map(() => `$${pIdx++}`).join(', ');
      params.push(...row);
      return `(${slots})`;
    });
    const sql = `INSERT INTO "${table}" (${columns.map(c=>`"${c}"`).join(',')})
                 VALUES ${placeholders.join(',\n')}
                 ON CONFLICT ${conflictTarget} DO NOTHING`;
    await prisma.$executeRawUnsafe(sql, ...params);
    log(`  ${table}: +${batch.length} rows (offset ${offset})`);
  }
}
```

**Parameter limit**: PostgreSQL caps at 65,535 bind params per query. Batch size of 4000 with 13 columns = 52,000 params — safely under limit.

### 3.7 Enum Casting in Raw SQL

PostgreSQL can't infer enum types from `$N` text params. All enum values must be cast:

```sql
-- In the VALUES placeholders, use explicit casts:
$3::"Role", $5::"MembershipStatus"
-- For InventoryAjustmentReason (schema typo — no 'd'):
$6::"InventoryAjustmentReason"
-- For OrderStatus:
$5::"OrderStatus"
-- etc.
```

The enum columns that require casting in raw SQL:
- `Membership.role` → `"Role"`
- `Membership.status` → `"MembershipStatus"`
- `Customer.status` → `"CustomerStatus"`
- `Product.active` → plain boolean, no cast needed
- `Location.type` → `"LocationType"`
- `Location.status` → `"LocationStatus"`
- `InventoryAdjustment.reason` → `"InventoryAjustmentReason"` (typo is intentional — matches schema)
- `Order.status` → `"OrderStatus"`

### 3.8 Idempotency Guard

Skip if already seeded:
```typescript
const orgCount = await prisma.organization.count();
if (orgCount >= 100) {
  log('Demo DB already seeded. Run make demo-reset to start fresh.');
  return;
}
```

All bulk inserts use `ON CONFLICT ... DO NOTHING`.

### 3.9 Execution Order (respects FK constraints)

```
1. Organizations      (no deps) → collect orgId[]
2. Users              (no deps) → collect userId[]
3. Memberships        (orgs, users) → collect {membershipId, orgId, userId, role}
4. Locations          (orgs) → collect {locationId, orgId}
5. MembershipLocations (memberships, locations)

Per-org loop (120 iterations, keeps memory bounded):
  6.  Products          → bulkInsert → keep {productId, orgId, priceCents, name, sku}[]
  7.  Customers         → bulkInsert → keep {customerId, orgId}[]
  8.  InventoryLevels   (products × locations for this org) → bulkInsert → clear
  9.  InventoryAdjustments (INITIAL_STOCK, 1 per level) → bulkInsert → clear

  Per-location loop:
  10. Orders (N orders for this location) → bulkInsert in 4000-row batches → clear
  11. OrderItems (1-5 items per order) → bulkInsert in 4000-row batches → clear
```

This caps peak memory at ~5MB (4000 orders × ~13 fields + 4000×2 items × ~12 fields).

### 3.10 Timestamps

- `updatedAt` must be set explicitly (Prisma `@updatedAt` is not applied in raw SQL)
- Orders span 2 years: `NOW() - 730 days` to `NOW()`
- Seasonal Q4 bias: for 30% of orders, sample `createdAt` from Oct–Dec range
- `placedAt` = `createdAt` for CONFIRMED/FULFILLED/REFUNDED, null for PENDING
- `cancelledAt` = `createdAt + [1,48] hours` for CANCELLED, null otherwise

### 3.11 Password Hashing

Hash `DemoPass123!` once at startup with bcryptjs rounds=10. Reuse the same hash string for all ~1,500 users. This avoids 1,500 bcrypt calls (~2 minutes of savings).

### 3.12 User Role Distribution Per Org

```
roles = ['OWNER'] always
if userCount > 1: push 'MANAGER'
remaining users: weighted pick from ['CASHIER'(50%), 'INVENTORY_CLERK'(25%), 'SUPPORT'(15%), 'MANAGER'(10%)]
```

### 3.13 Order Status Weights

```
FULFILLED: 70%  PENDING: 10%  CONFIRMED: 10%  CANCELLED: 7%  REFUNDED: 3%
```

### 3.14 Order Items Per Order

```
1 item: 40%  2 items: 30%  3 items: 15%  4 items: 10%  5 items: 5%
```

Each item picks a random product from the org's product pool. `unitPriceCents` = product `priceCents`. `qty` = rngInt(1, 5). Tax = 13% of subtotal. Discount = 0 for simplicity.

---

## 4. `docs/DEMO_DATABASE.md`

Document:
1. **Overview**: Purpose, data volumes, business types
2. **Quick Start** (step-by-step: `make demo-up` → `make demo-migrate` → `make demo-seed`)
3. **Switching between databases** (`make use-demo` / `make use-dev` + restart)
4. **Data summary table** with entity counts
5. **Demo credentials** (password: `DemoPass123!`, user emails follow pattern)
6. **Reset / rebuild** (`make demo-reset`)
7. **Performance notes** (synchronous_commit=off, seed duration estimate ~20-30 min)
8. **Prerequisites** (Node.js ≥20 on host for running seed via `npx tsx`)

---

## Verification

1. `make demo-up` — verify `db_demo` container starts and is healthy
2. `make demo-migrate` — verify migrations run against port 5433
3. `make demo-seed` — verify seed completes without errors, watch progress logs
4. `psql postgres://postgres:postgres@localhost:5433/ledgerlight_demo -c "SELECT COUNT(*) FROM \"Order\";"` — verify ~1.2M rows
5. `make use-demo` — verify `.env` `DATABASE_URL` is updated
6. `docker compose restart backend` — verify app connects to demo db and serves data
7. `make use-dev` — verify switch back to dev db works
8. Run `make demo-seed` a second time — verify idempotency guard exits cleanly ("Already seeded")
