# Team Role Management

This project manages team access at the organization membership level, not at the global user level.

## Roles

| Role | Purpose | Team management |
| --- | --- | --- |
| `OWNER` | Full administrative access | Can manage every member, including managers and other owners subject to last-owner protection |
| `MANAGER` | Full operational access | Can invite and manage lower-tier roles |
| `CASHIER` | Sales and fulfillment workflows | No team management access |
| `SUPPORT` | Read-only operational access | No team management access |
| `INVENTORY_CLERK` | Inventory-focused workflows | No team management access |

## Permission model

- Permissions are evaluated per organization membership through `OrganizationContextGuard` and `PermissionsGuard`.
- `OWNER` retains wildcard access.
- `MANAGER` now has `users.invite` and can manage lower-tier members.
- `users.manage` remains effectively owner-only for same-tier and high-tier actions.

## Tier rules

- Team rows represent `Membership` records.
- A user can hold different roles in different organizations.
- Owners can manage any non-owner member by default.
- Managers can only assign or manage lower-tier roles.
- Self role changes and self deactivation are blocked.
- Demoting or deactivating the last active owner is blocked.

## Membership status

- `INVITED`: invite created, waiting for acceptance
- `ACTIVE`: fully active membership, included in JWT organization context
- `DEACTIVATED`: retained for audit/history but excluded from active auth context

## Location scoping

- Memberships can be scoped to a subset of locations through `MembershipLocation`.
- No location rows means full organization access.
- Location scope is enforced for location-bound domains such as orders, inventory, inventory adjustments, dashboard metrics, and locations.
- Customers and products remain organization-scoped.

## Invitations

- Invites create or reuse a `Membership`, then issue an expiring `InviteToken`.
- New users set their password during invite acceptance.
- Existing users accept the invite against their existing account.
- In non-production environments the generated invite URL is returned/logged through the delivery adapter fallback.

## Audit coverage

- Team mutations write audit log entries for invite send/resend/accept, role changes, deactivation/reactivation, and location scope updates.
