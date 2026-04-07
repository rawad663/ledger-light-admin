# AGENTS.md

## Project Overview

Ledger Light Admin is a multi-tenant SaaS admin panel built as a monorepo:

- **Backend**: NestJS 11, TypeScript, Prisma 7.4, PostgreSQL
- **Frontend**: Next.js 16, React 19, Tailwind CSS, shadcn/ui
- **Testing**: Jest 30 (backend), Vitest (frontend)

## Quick Start

```bash
make dev-build              # Start dev environment (Docker)
make run-migrations         # Run Prisma migrations
make run-seed               # Seed the database

# Backend
cd backend && npm test       # Run tests (watch)
cd backend && npm run test:run  # Run tests (single run)
cd backend && npm run test:cov  # Coverage report

# Frontend
cd frontend && npm run test:run
```

Swagger docs: `http://localhost:8080/docs`

## Repository Layout

```
backend/
  src/
    domain/[name]/          # Domain modules (module, controller, service, dto, specs)
    common/                 # Decorators, guards, filters, interceptors, middlewares, DTOs, permissions
    infra/prisma/           # PrismaService, PrismaModule
    test-utils/             # Prisma mocks, fixtures, setup, validation helpers
  prisma/                   # schema.prisma, migrations/, seed.ts
frontend/
  src/
    app/                    # Next.js App Router pages
    components/             # UI components (shared/, ui/, feature-specific/)
    hooks/                  # Custom hooks (use-api, use-cursor-pagination, etc.)
    lib/                    # Utilities, formatters, generated API types
docs/                       # Conventions and feature design documents
```

## Principles

### Consistency

Every change must build on the patterns already established in the codebase. Before writing new code:

1. Read at least one existing module that does something similar.
2. Follow the same file structure, naming, decorator usage, and testing patterns.
3. Reuse existing utilities (location scoping, pagination, permissions) rather than creating new abstractions.

### Test-Driven

All features must be covered by tests. Testing is not optional and not an afterthought.

1. Every backend domain module ships with `[name].service.spec.ts` and `[name].controller.spec.ts`.
2. Every frontend feature ships with tests for hooks, utilities, and components that contain logic or affect behavior.
3. Test scenarios must cover happy paths, edge cases, validation failures, permission denials, and multi-tenant isolation.
4. Every new domain feature ships with a design doc under `docs/` (see Documentation Rules below).

## Conventions Reference

- Backend patterns: [docs/BACKEND_CONVENTIONS.md](docs/BACKEND_CONVENTIONS.md)
- Frontend patterns: [docs/FRONTEND_CONVENTIONS.md](docs/FRONTEND_CONVENTIONS.md)
- Team & RBAC design: [docs/team-role-management.md](docs/team-role-management.md)

## Security Invariants

These rules must never be violated. Breaking any of them is a data-leak or privilege-escalation risk.

1. **Org-scoped queries**: Every query on tenant data MUST include `organizationId` in the where clause.
2. **Controller protection**: Every org-scoped controller MUST use `@OrgProtected()` at the class level.
3. **Permission declarations**: Every endpoint MUST declare permissions via `@RequirePermissions()` or `@RequireAnyPermission()`. The guard default-denies routes without declared permissions.
4. **Location scoping**: Location-scoped members MUST be filtered using `getLocationScopeWhere()` and validated with `ensureLocationAccessible()`.
5. **Audit logging**: All write operations MUST record audit logs with before/after JSON snapshots.
6. **Transactions**: Multi-step write operations MUST use `prisma.$transaction()`.
7. **Input validation**: DTOs MUST use class-validator decorators. The global ValidationPipe rejects unknown fields (`whitelist: true`, `forbidNonWhitelisted: true`).
8. **Error responses**: Never expose internal error details in HTTP responses. The `AllExceptionsFilter` handles this.

## Code Generation Rules

### Backend

- **Module structure**: `domain/[name]/` with `module.ts`, `controller.ts`, `service.ts`, `dto.ts`, and spec files.
- **Controllers are thin**: Route handler + decorators + delegation to service. No business logic, no database calls.
- **Services are thick**: All business logic lives here. Inject `PrismaService` directly (no repository layer).
- **Organization scope**: Services accept `organization: CurrentOrg | string` as first parameter. Normalize with `resolveOrganizationScope(organization)` at the top of every method.
- **Location scoping**: Use `hasRestrictedLocations()`, `getLocationScopeWhere()`, and `ensureLocationAccessible()` from `common/organization/location-scope.ts`.
- **Pagination**: Use `PrismaService.paginateMany()` with cursor encoding. Return `{ data, totalCount, nextCursor }`.
- **Swagger**: Use `@ApiDoc()` composite decorator (not raw `@ApiOperation` + `@ApiResponse`).
- **Money**: Stored as integer cents (`priceCents`, `totalCents`). Never floats.
- **Compound keys**: Use `id_organizationId` for `findUnique`/`update`/`delete` where available.

### Frontend

- See [docs/FRONTEND_CONVENTIONS.md](docs/FRONTEND_CONVENTIONS.md) for full rules.
- Use generated API types from `lib/api-types.ts` (never hand-maintain backend response shapes).
- Use `useApiClient()` for client-side requests and `createApi()` for server-side.
- Use `react-hook-form` + Zod for non-trivial forms.
- Keep route files thin; extract dense UI into feature subcomponents.

## Test Integrity

**Tests are the source of truth for business logic.** An agent must NEVER:

- Remove or weaken assertions to make a failing test pass.
- Mock data that doesn't correspond to real codebase structures or Prisma schema.
- Skip, disable, or comment out failing tests.
- Reduce test coverage to avoid dealing with edge cases.

**If a test fails, fix the implementation — not the test, unless the test is not complete.** A failing test means the implementation is wrong or the test is missing coverage. In either case, the resolution adds correctness, never removes it.

## Testing Rules

### Backend

- Use `createPrismaMock()` from `test-utils/prisma.mock.ts` for database mocking.
- Use `Test.createTestingModule()` from `@nestjs/testing` for DI setup.
- Transaction mocking: pass a separate `tx` mock: `const tx = createPrismaMock(); const prisma = createPrismaMock(tx);`
- When testing org-scoped methods with a plain string orgId, `resolveOrganizationScope` defaults to OWNER with `hasAllLocations: true`.
- To test location-restricted behavior, pass a full `CurrentOrg` object: `{ membershipId, organizationId, role, hasAllLocations: false, allowedLocationIds: [...] }`.
- Controller tests: mock the service entirely, verify delegation and error propagation.
- Service tests: mock PrismaService methods, test business logic branches.

### Frontend

- Use Vitest + `@testing-library/react` for component tests.
- Shared utilities and hooks that affect behavior should ship with focused tests.

## Documentation Rules

Every new domain feature must ship with a design doc under `docs/`. The doc should include:

- **Data model**: Entities, relationships, enums, and constraints.
- **Endpoints**: Routes, HTTP methods, request/response shapes, permissions required.
- **Business rules**: Validation rules, state transitions, edge cases.
- **Permission model**: Which roles can perform which actions.

Use `docs/team-role-management.md` as a reference for format and depth.

## Common Mistakes

- **Missing `organizationId` in queries** — cross-tenant data leak.
- **Creating a repository layer** — services use PrismaService directly.
- **Using floats for money** — use integer cents.
- **Business logic in controllers** — controllers only validate, extract params, and delegate.
- **Using `findUnique` without org scoping** — use compound where (`id_organizationId`) or `findFirst` with `organizationId`.
- **Skipping audit logging on mutations** — every write needs an audit log.
- **Adding permissions without updating mappings** — new permissions must go in `permissions.ts` AND `role-permissions.ts`.
- **Forgetting AppModule registration** — new modules must be imported in `app.module.ts`.
- **Hand-editing migration SQL** — use `npx prisma migrate dev --name descriptive_name`.

## PR Checklist

Before considering work complete, verify:

- [ ] All queries on tenant data include `organizationId` in the where clause.
- [ ] Controllers use `@OrgProtected()` and declare permissions on every method.
- [ ] Write operations include audit logging.
- [ ] Multi-step writes are wrapped in `$transaction()`.
- [ ] DTOs have class-validator decorators and are documented with `@ApiProperty` where needed.
- [ ] Service spec and controller spec files exist and cover happy paths + error cases.
- [ ] `npm run lint`, `npm run test:run`, and `npm run build` all pass in `backend/`.
- [ ] Frontend changes pass `npm run lint`, `npm run test:run`, and `npm run build` in `frontend/`.
- [ ] A design doc exists under `docs/` for any new domain feature.
- [ ] New modules are registered in `app.module.ts`.
- [ ] New permissions are added to `permissions.ts` and granted to roles in `role-permissions.ts`.
