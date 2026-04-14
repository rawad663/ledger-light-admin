# LedgerLight Monorepo Restructure Plan

## Objective
Restructure the current LedgerLight repository into a true monorepo so the codebase can scale cleanly across multiple runnable applications and shared packages, while preserving local development speed, Docker Compose ergonomics, and the ability to ship incrementally.

This document intentionally ignores the MCP server for now. The goal is to create the right monorepo foundation first.

---

## Why Restructure
The current repository is already trending toward multiple concerns living side by side: frontend, backend, database, auth, RBAC, observability, and eventually workers or other services. Keeping everything tightly coupled inside one app will eventually create friction in a few places:

- business logic becomes trapped inside framework-specific code
- frontend and backend types drift apart
- Docker and local dev get harder to reason about as services multiply
- shared logic gets duplicated or imported in messy ways
- future additions like workers, separate services, or alternative interfaces become harder to introduce cleanly

A monorepo solves this by separating:

- **runnable apps** from
- **shared reusable packages**

The result should feel like one product with one codebase, but with clearer boundaries and more room to grow.

---

## Design Principles

### 1. Keep apps thin
Applications should focus on transport and delivery concerns:
- HTTP controllers
- frontend pages and UI composition
- dependency wiring
- request/response mapping
- process bootstrapping

They should not become the main home of business logic.

### 2. Move real logic into shared packages
Core business rules, use cases, contracts, and infrastructure adapters should live in reusable packages so they can be used consistently across applications.

### 3. Avoid overengineering
This restructure is meant to improve clarity, not introduce architecture for architecture’s sake. Every package should exist because it has a clear ownership boundary.

### 4. Preserve the current product momentum
The migration should be incremental. LedgerLight should continue running throughout the restructure.

### 5. Keep Docker Compose viable
The monorepo must support the current local development style. Docker Compose should still be able to orchestrate the main app services and supporting infrastructure.

---

## Target Repository Shape

```txt
ledgerlight/
  apps/
    admin/              # Next.js admin frontend
    api/                # NestJS REST API
  packages/
    auth/               # auth helpers, permission matrix, org scoping
    contracts/          # shared DTOs, schemas, response types, event payloads
    database/           # Prisma schema, migrations, client, seeds, test DB helpers
    domain/             # core business concepts and invariants
    application/        # use cases / orchestration layer
    infrastructure/     # repository implementations, logging, queues, metrics, adapters
    config/             # shared tsconfig / eslint / env helpers
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  docker-compose.yml
```

This is the recommended **first real monorepo target**. It is intentionally small and practical.

---

## Directory Ownership

## `apps/`
`apps/` contains code that can actually be started as a process.

### `apps/admin`
Owns the admin frontend.

Responsibilities:
- Next.js routes and pages
- layouts and frontend composition
- forms, tables, navigation
- frontend auth/session integration
- React Query hooks or frontend data fetching adapters
- UI state and UX behavior

Should not own:
- deep business rules
- database access
- shared domain invariants

### `apps/api`
Owns the HTTP backend.

Responsibilities:
- NestJS modules/controllers/guards
- Swagger/OpenAPI wiring
- HTTP request validation and mapping
- auth entrypoints
- dependency injection bootstrapping
- converting use cases into HTTP endpoints

Should not own:
- reusable domain logic that other apps may need
- repository implementations tightly coupled to controller logic
- duplicated validation contracts that belong in shared packages

---

## `packages/`
`packages/` contains reusable code shared across applications.

### `packages/domain`
The pure business heart of LedgerLight.

Examples:
- entities and value objects
- order status rules
- inventory adjustment invariants
- role semantics
- domain-level validation rules

This layer should stay framework-light.

### `packages/application`
The use-case layer.

Examples:
- create customer
- update product
- search orders
- create inventory adjustment
- cancel order
- get inventory levels

This layer coordinates domain rules, permissions, repositories, and side effects. Both the API and future services should call into this layer.

### `packages/infrastructure`
Concrete technical implementations.

Examples:
- Prisma repository implementations
- structured logger adapters
- metrics adapters
- queue/event publisher adapters
- cache adapters

This package is where interfaces from the application layer get connected to real technologies.

### `packages/database`
Database-specific ownership.

Examples:
- Prisma schema
- migrations
- Prisma client setup
- seed scripts
- test database utilities

This package should be the single source of truth for DB structure and DB bootstrapping.

### `packages/contracts`
Shared types and schemas.

Examples:
- Zod schemas
- shared DTOs
- query parameter shapes
- common API response types
- event payload contracts

This helps keep frontend and backend aligned and reduces type drift.

### `packages/auth`
Shared authorization and auth-context logic.

Examples:
- role matrix
- permission evaluation helpers
- org-scoping helpers
- auth context types
- reusable membership/role guards logic that is not Nest-specific

### `packages/config`
Shared repo-level tooling config.

Examples:
- base TypeScript config
- ESLint config
- Prettier config
- environment parsing helpers

This is optional at first, but useful as soon as the workspace grows.

---

## Dependency Direction
The monorepo should have a clear dependency flow.

### Preferred direction
- `apps/admin` → `packages/contracts`
- `apps/api` → `packages/application`, `packages/auth`, `packages/contracts`, `packages/infrastructure`, `packages/database`
- `packages/application` → `packages/domain`, `packages/contracts`, `packages/auth`
- `packages/infrastructure` → `packages/database`, `packages/domain`, `packages/contracts`

### Avoid
- domain importing from infrastructure
- application importing framework-specific Nest modules
- frontend importing server-only database code
- apps becoming the source of truth for shared business behavior

The most important rule: **shared business logic should flow downward into packages, not upward into apps**.

---

## Recommended Workspace Setup
Use a workspace-based monorepo managed from the repository root.

### Root owns:
- workspace definition
- lockfile
- root scripts
- shared dev tooling

### Each app/package owns:
- its own `package.json`
- its own local dependencies
- its own build/dev/test entrypoints

### Recommendation
Use **pnpm workspaces**.

Why:
- fast installs
- strong workspace support
- good monorepo ergonomics
- clear dependency boundaries
- efficient linking across local packages

### Expected setup

```txt
ledgerlight/
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  node_modules/
  apps/
    admin/package.json
    api/package.json
  packages/
    domain/package.json
    application/package.json
    infrastructure/package.json
```

This means the repo behaves like one workspace, but each app/package still declares its own dependencies explicitly.

---

## Build and Local Development Model
The monorepo should preserve a simple mental model:

- `apps/` are processes
- `packages/` are imported code

### Local development
The main workflows should remain straightforward:
- run the admin app
- run the API
- run Postgres and any supporting infra
- make changes in shared packages and see those changes reflected in dependent apps

### Root scripts
At the root level, scripts should make the common workflows obvious.

Examples:
- `dev`
- `dev:admin`
- `dev:api`
- `build`
- `test`
- `lint`
- `typecheck`

### Per-app scripts
Each runnable app should own its own implementation details.

Examples:
- `apps/admin`: `dev`, `build`, `start`
- `apps/api`: `dev`, `build`, `start`, `test`

### Shared package scripts
Packages may expose:
- `build`
- `test`
- `lint`
- `typecheck`

Where possible, packages should stay easy to consume without excessive custom build complexity.

---

## Docker Compose Impact
The restructure should not replace Docker Compose. It should refine how Docker Compose interacts with the codebase.

### What changes
Docker Compose will orchestrate runnable services from `apps/`.

Examples:
- `admin`
- `api`
- `db`
- `redis` (optional later)

### What does not change
Shared packages do not become services. They are simply part of the code mounted or copied into the service builds.

### Practical implication
Each app’s Docker build should use the **repo root as build context** so it can access both:
- its own `apps/...` source
- shared `packages/...` source

### Development mode
During local dev, Compose can mount the repository so changes in shared packages flow into whichever app uses them.

### Production build mode
Each app can still build into its own image while pulling shared code from the same workspace.

### Key guardrails
- keep Dockerfiles app-specific
- keep build context at the repo root
- keep workspace install steps deterministic
- watch for file watcher issues inside containers when mounting large monorepos

---

## Migration Strategy
This should be done in phases, not one giant rewrite.

## Phase 1 — Introduce workspace scaffolding
Goal: convert the repository into a workspace without changing runtime behavior.

Tasks:
- add root workspace config
- create `apps/` and `packages/` directories
- move current frontend into `apps/admin`
- move current backend into `apps/api`
- keep code behavior unchanged
- make existing scripts work from the new locations
- confirm Docker Compose still boots the system

Definition of done:
- app still runs end to end
- no architecture extraction yet
- only structural move completed

## Phase 2 — Extract shared foundations
Goal: move obvious shared concerns out of app code.

Best first candidates:
- `packages/database`
- `packages/contracts`
- `packages/auth`

Tasks:
- centralize Prisma schema/client/migrations/seeds into `packages/database`
- extract shared schemas/types into `packages/contracts`
- extract reusable role/org permission logic into `packages/auth`

Definition of done:
- frontend and backend share contracts cleanly where appropriate
- DB ownership is centralized
- auth semantics are no longer buried in controllers/services

## Phase 3 — Extract use cases and domain rules
Goal: separate business logic from Nest-specific backend wiring.

Tasks:
- identify the most important use cases
- extract them into `packages/application`
- move domain rules into `packages/domain`
- leave controllers as thin adapters

Start with the highest-value domains:
- auth/session context
- products
- customers
- inventory
- orders

Definition of done:
- backend controllers mostly map requests to use cases
- business logic is testable without spinning up the HTTP layer

## Phase 4 — Extract infrastructure implementations
Goal: make technical integrations explicit.

Tasks:
- move Prisma repository implementations into `packages/infrastructure`
- move logger/metrics/event adapter code there as appropriate
- connect application use cases to infrastructure through clear interfaces or practical composition patterns

Definition of done:
- infrastructure details are explicit and swappable enough for future growth
- application layer is cleaner and easier to reason about

## Phase 5 — Harden the monorepo workflow
Goal: make the new structure pleasant to live in.

Tasks:
- clean up root scripts
- add typecheck/lint/test/build orchestration
- improve Dockerfiles if needed
- improve CI for workspace awareness
- add documentation for repo structure and dependency rules

Definition of done:
- developers can understand how to work in the repo quickly
- CI reflects the monorepo layout
- the structure feels deliberate rather than transitional

---

## Suggested Extraction Order by Practicality
To keep the migration grounded, extract in this order:

1. `apps/admin` and `apps/api` move
2. `packages/database`
3. `packages/contracts`
4. `packages/auth`
5. `packages/application`
6. `packages/domain`
7. `packages/infrastructure`
8. `packages/config`

This order minimizes disruption and gives quick wins early.

---

## What Should Stay Out of Shared Packages at First
To avoid premature abstraction, do **not** rush to extract everything.

Keep these local to apps initially unless reuse becomes obvious:
- admin-specific presentational components
- API-specific Nest module wiring
- one-off route logic that has no reuse value yet
- feature code that is still evolving rapidly and has not stabilized

The monorepo should create clearer boundaries, not force every file into a package too soon.

---

## Testing Strategy After Restructure
The new structure should improve testability.

### App-level tests
Use apps to test transport-level behavior:
- API integration tests
- frontend page/component/integration tests

### Package-level tests
Use packages to test logic in isolation:
- domain rule tests
- application use-case tests
- contract/schema tests
- infrastructure adapter tests where appropriate

This creates a healthier testing pyramid:
- package tests for fast confidence
- app tests for end-to-end confidence

---

## Risks and Mitigations

### Risk: overengineering too early
Mitigation:
- migrate in phases
- only extract code once ownership is clear
- prefer practical boundaries over theoretical purity

### Risk: Docker/local dev gets slower or more confusing
Mitigation:
- preserve root scripts
- keep Compose orchestration simple
- document how apps and packages relate

### Risk: import chaos across packages
Mitigation:
- define dependency direction early
- document what each package owns
- avoid circular dependencies

### Risk: losing momentum on feature delivery
Mitigation:
- treat the restructure as a controlled platform improvement
- keep each phase shippable
- avoid giant refactors with no immediate stability checkpoint

---

## Success Criteria
The restructure is successful if LedgerLight gains the following properties:

- frontend and backend live as clearly separate runnable apps
- shared business logic no longer lives deep inside framework-specific code
- shared schemas and DB ownership are explicit
- Docker Compose still supports a smooth local workflow
- CI/testing/build flows understand the workspace structure
- future additions such as workers or alternative interfaces can be added without repo chaos

---

## Final Recommendation
Do the restructure now, but keep the first pass focused.

The immediate goal is not to build a perfect layered architecture. The immediate goal is to create a **real monorepo foundation** with:
- `apps/admin`
- `apps/api`
- `packages/database`
- `packages/contracts`
- `packages/auth`

Once that is stable, move progressively into:
- `packages/application`
- `packages/domain`
- `packages/infrastructure`

That sequence gives LedgerLight a clean path from “single repo with multiple concerns” to “deliberate monorepo with strong architectural boundaries,” without stalling the product.

---

## Proposed Next Step
The next implementation artifact should be a **concrete migration checklist** for the current repository, mapping existing folders/files into their future monorepo locations.

