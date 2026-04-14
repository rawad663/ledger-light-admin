# Ledger Light Monorepo Phase 2-3 Extraction Plan

## Summary

Phase 2 and 3 will convert the current workspace scaffold into a real shared-package architecture by extracting:
- atomic shared UI from `apps/admin`
- shared schemas and transport contracts into one package
- auth, roles, permissions, and session/access rules
- framework-free domain logic
- application-layer use cases and ports
- infrastructure adapters that let `apps/api` wire those packages into Nest and Prisma

This phase preserves current HTTP routes, admin routes, database schema, and environment behavior. The goal is architectural extraction without product behavior change.

## Package Model And Interfaces

### New and expanded packages
- `@ledgerlight/ui`
  - New package for atomic UI primitives only.
  - Move `components/ui/*`, UI-only helpers, and the shared theme provider here.
  - Do not move feature components, page shells, route components, or feature hooks.
  - Keep global CSS, Tailwind app theme tokens, and app-level layout ownership in `apps/admin`.

- `@ledgerlight/contracts`
  - Single shared package for both transport contracts and reusable schemas.
  - Own:
    - generated OpenAPI types
    - curated transport-facing exports
    - shared Zod schemas for request, response, form, filter, cursor, id, money, date, auth, invite, role, and permission shapes
    - schema-derived TypeScript types used across admin and api
  - Split the package internally into clear sub-entrypoints:
    - generated transport types
    - stable contracts
    - schemas
  - `apps/api` must derive thin Nest DTO wrappers from this package instead of hand-authoring duplicate DTO field definitions.
  - `apps/admin` must use the same package for forms, filters, query parsing, and client validation.

- `@ledgerlight/auth`
  - Single source of truth for:
    - roles
    - permissions
    - role tier rules
    - role-permission mappings
    - membership/org/location scope types
    - session/auth payload shapes safe to share
    - route-access and capability helpers used by both admin and api
  - `apps/admin` access helpers and `apps/api` permission logic must consume the same exported rules.

- `@ledgerlight/domain`
  - Framework-free domain code only.
  - Create domain modules for:
    - auth
    - team
    - customer
    - location
    - product
    - inventory
    - order
    - payment
    - dashboard
    - audit-log
    - health
  - Move invariants, state transitions, calculators, policy checks, and domain events here.
  - No Nest, Next, Prisma, Stripe, or HTTP concerns are allowed in this package.

- `@ledgerlight/application`
  - Create use-case modules matching the domain modules.
  - Own commands, queries, orchestration, ports, and result shapes.
  - Application code may depend on `domain`, `auth`, and `contracts`, but not on Nest, Next, Prisma, or direct database clients.

- `@ledgerlight/infrastructure`
  - Own Prisma-backed repositories, Stripe adapters, token/hash providers, telemetry/logging adapters, and other technical implementations for application ports.
  - `apps/api` composes application + infrastructure; business rules do not remain in Nest services.

### App ownership after extraction
- `apps/api`
  - Keeps Nest modules, controllers, guards, interceptors, filters, env/bootstrap, route registration, DTO wrappers derived from `@ledgerlight/contracts`, and dependency wiring.
  - Service classes become thin orchestration/wiring layers or disappear where use cases replace them cleanly.

- `apps/admin`
  - Keeps routes, feature components, page composition, server/client data fetching, and app-specific layout concerns.
  - Imports atomic UI from `@ledgerlight/ui`, contracts and schemas from `@ledgerlight/contracts`, and access/auth rules from `@ledgerlight/auth`.

## Implementation Changes

### 1. Shared foundations first
- Add `packages/ui`.
- Expand `@ledgerlight/contracts` to own both generated API types and shared schemas.
- Refactor current `apps/admin` auth/session/access helpers and `apps/api` permission/role helpers onto `@ledgerlight/auth`.
- Reorganize `@ledgerlight/contracts` so apps import stable curated entrypoints instead of reaching into generated output directly.

### 2. Convert API DTOs to contract-derived wrappers
- Replace handwritten duplicate DTO field definitions with DTO wrappers derived from `@ledgerlight/contracts` schemas.
- Keep Swagger/Nest controller ergonomics in `apps/api`, but validation shape ownership moves to `@ledgerlight/contracts`.
- Existing API wire shapes stay unchanged unless an additive fix is required to preserve current behavior.

### 3. Extract business logic into domain and application packages
- Move each domain in this order:
  1. auth, team, location
  2. product, inventory, order, customer
  3. payment, dashboard, audit-log, health
- For each domain:
  - move pure rules and state logic into `@ledgerlight/domain`
  - move orchestration and ports into `@ledgerlight/application`
  - move Prisma/Stripe/technical adapters into `@ledgerlight/infrastructure`
  - leave Nest controllers and route wiring in `apps/api`
- `apps/api` services must stop owning business rules once a domain is extracted.

### 4. Enforce dependency direction
- Add workspace import boundaries so:
  - `apps/admin` may import `ui`, `contracts`, `auth`, `config`
  - `apps/api` may import all shared packages
  - `domain` imports no framework or infrastructure code
  - `application` imports no Nest, Next, Prisma, or Stripe code
  - `infrastructure` is the only layer allowed to depend on Prisma and external technical clients
- Add root scripts so package builds/tests/linting run as first-class workspace tasks, not app-only tasks.

## Test Plan

- Keep all existing admin and api unit/integration suites green throughout the extraction.
- Add package-level tests for:
  - `@ledgerlight/ui` render and interaction smoke tests for atomic primitives
  - `@ledgerlight/contracts` schema parse/validation tests, generated-type compatibility tests, and schema-to-DTO parity tests
  - `@ledgerlight/auth` permission matrix, role tier, route-access, and location-scope tests
  - `@ledgerlight/domain` state transition, invariant, and calculator tests per domain
  - `@ledgerlight/application` use-case tests with in-memory fakes for ports
  - `@ledgerlight/infrastructure` adapter tests where behavior is non-trivial
- Update api controller/service tests so they verify contract-derived DTO use and delegation to extracted application/domain code.
- Keep admin feature tests focused on behavior parity after import moves.
- Acceptance criteria:
  - root workspace Prisma, lint, build, unit, and integration commands all pass
  - no duplicated role/permission definitions remain in admin and api
  - no duplicated validation shape definitions remain once a contract/schema has been extracted
  - extracted business logic compiles and tests without Nest/Next/Prisma dependencies

## Assumptions And Defaults

- `@ledgerlight/contracts` is the single package for generated API types, curated transport contracts, and shared validation schemas.
- Shared schemas are Zod-first and become the source for both admin validation and api DTO wrappers.
- Atomic UI extraction stops at primitives and shared UI-only helpers; feature UI stays in `apps/admin`.
- No database migration or route redesign is part of this phase unless a small additive compatibility fix is required.
- All current domains are included in the extraction scope, but they move in ordered waves so the repo stays shippable after each wave.
