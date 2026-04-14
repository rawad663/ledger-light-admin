# Ledger Light Monorepo Restructure Plan V2

## Summary

Restructure the repo into a workspace monorepo that preserves the current `dev` / `qa` / `prod` model, keeps `monitoring/`, `docs/`, and `scripts/` at the repo root, and moves the runnable code into `apps/frontend` and `apps/backend`. Start with a structural migration only, then extract shared packages in stages so the current product, Docker flows, QA observability, and test harnesses keep working throughout.

Target shape:

```txt
ledger-light-admin/
  apps/
    frontend/
    backend/
  packages/
    config/
    database/
    contracts/
    auth/
    domain/
    application/
    infrastructure/
  monitoring/
  docs/
  scripts/
  tests/
    e2e/
  package.json
  package-lock.json
  docker-compose.yml
  docker-compose.dev.yml
  docker-compose.qa.yml
  docker-compose.prod.yml
  .env.dev.example
  .env.qa.example
  .env.prod.example
```

## Key Changes

- Adopt `npm` workspaces at the repo root with one root `package.json` and one root lockfile. Remove per-app lockfiles after the workspace install is stable.
- Move `frontend/` to `apps/frontend/` and `backend/` to `apps/backend/` with no behavior changes in the first phase.
- Keep `monitoring/` top-level. It remains owned by the QA observability stack and Compose overlays, not by a runtime app or shared package.
- Keep `docs/` top-level. Add one architecture doc that defines workspace rules, dependency direction, app/package ownership, and the testing taxonomy.
- Keep root `.env.dev`, `.env.qa`, and `.env.prod` as the authoritative environment contract for all apps. Do not reintroduce app-local env files.
- Update Docker Compose builds to use the repo root as build context and app-specific Dockerfiles under `apps/backend/`. This is required before shared packages can be imported reliably.
- Keep Make as the main operator interface. Root targets continue to own `dev`, `qa`, `prod`, migrate, seed, and logs flows.

## Implementation Changes

### Phase 1: Workspace scaffold without behavioral change
- Add root workspace config and root scripts for `build`, `lint`, `test`, `test:unit`, `test:integration`, and per-app variants.
- Move code to `apps/frontend` and `apps/backend`.
- Update imports, path aliases, Dockerfiles, Compose paths, Makefile paths, CI working directories, and root env-loading helpers to the new locations.
- Preserve current frontend behavior, backend behavior, QA monitoring, and root scripts during this phase.

### Phase 2: Extract shared foundations already visible in the current repo
- Create `packages/config` for shared TypeScript, ESLint, and root env-loading helpers.
- Create `packages/database` for Prisma schema, migrations, generated client wiring, seeds, and backend integration DB helpers.
- Create `packages/contracts` for intentionally shared API-facing contracts and generated client types now consumed by the frontend.
- Create `packages/auth` for shared permission enums, role mappings, org scope types, and location-scope helpers that should not remain buried in the backend app.
- Do not extract domain/application logic yet beyond what is already clearly shared.

### Phase 3: Extract stable business logic from the backend app
- Keep Nest modules, controllers, guards, filters, interceptors, and app bootstrapping in `apps/backend`.
- Extract stable business rules into `packages/domain` and use-case orchestration into `packages/application`.
- Start with the backend areas that already have the strongest test and doc coverage: auth/session context, products, inventory, orders, customers, and team access.
- Leave health endpoints, HTTP transport mapping, and app-specific telemetry wiring in `apps/backend`.

### Phase 4: Extract technical adapters without moving monitoring ownership
- Create `packages/infrastructure` for Prisma repository implementations, Stripe-facing adapters, shared logging/telemetry helpers, and other reusable technical integrations.
- Keep `monitoring/` as the source of truth for Grafana, Prometheus, Loki, Tempo, and collector config used by QA.
- Keep QA smoke verification and environment validation as root-level automation under `scripts/` unless a later repo-wide system-test layer is introduced.

### Phase 5: Harden the repo workflow
- Replace app-specific CI workflows with workspace-aware CI orchestration while still allowing frontend-only and backend-only path filtering.
- Add a root architecture doc plus updates to `docs/ENVIRONMENTS.md`, `docs/MONITORING.md`, and `docs/INTEGRATION_TESTS.md` so the new structure is documented as the source of truth.
- Enforce dependency direction:
  - apps may import packages
  - `application` may import `domain`, `contracts`, and `auth`
  - `infrastructure` may import `database`, `domain`, and `contracts`
  - `domain` imports nothing framework-specific

## Test Plan

- Keep app unit tests with their app/package owners:
  - `apps/backend/src/**/*.spec.ts`
  - `apps/frontend` unit tests alongside hooks, libs, and behavior-heavy UI
- Keep app integration tests inside each app:
  - `apps/backend/test/integration` continues to run real Nest HTTP flows against a disposable PostgreSQL database
  - `apps/frontend/test/integration` continues to run the built Next app against a disposable mock backend
- Add a new top-level cross-app E2E layer at `tests/e2e/` for real multi-process scenarios that cross app boundaries.
- First future E2E target should be real `frontend -> backend` browser flows. Additional cross-app process flows should also land in `tests/e2e/`, not inside either app’s integration suite.
- Root test scripts should distinguish:
  - unit
  - app integration
  - cross-app E2E
  - environment/system smoke checks

## Assumptions And Defaults

- Package manager: `npm` workspaces is the default choice for this restructure.
- App naming: use `frontend` and `backend` to minimize migration churn.
- Monitoring ownership stays top-level because it is an environment/platform concern, not app code.
- Environment model stays root-driven with explicit `dev`, `qa`, and `prod` files and Compose overlays.
- The restructure is incremental and shippable phase by phase; no single phase is allowed to require a stop-the-world rewrite.
