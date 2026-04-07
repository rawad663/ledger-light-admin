import { Role } from '@prisma/generated/enums';
import { ROLE_TIER, canAssignRole, canManageMember } from './role-tier';

describe('role-tier helpers', () => {
  it('keeps owners above every other role', () => {
    expect(ROLE_TIER[Role.OWNER]).toBeLessThan(ROLE_TIER[Role.MANAGER]);
    expect(ROLE_TIER[Role.MANAGER]).toBeLessThan(ROLE_TIER[Role.CASHIER]);
  });

  it('allows owners to assign any role and managers only lower-tier roles', () => {
    expect(canAssignRole(Role.OWNER, Role.OWNER)).toBe(true);
    expect(canAssignRole(Role.OWNER, Role.MANAGER)).toBe(true);
    expect(canAssignRole(Role.MANAGER, Role.CASHIER)).toBe(true);
    expect(canAssignRole(Role.MANAGER, Role.MANAGER)).toBe(false);
    expect(canAssignRole(Role.MANAGER, Role.OWNER)).toBe(false);
  });

  it('prevents same-tier management unless explicitly allowed for owners', () => {
    expect(canManageMember(Role.OWNER, Role.OWNER)).toBe(false);
    expect(
      canManageMember(Role.OWNER, Role.OWNER, { allowSameTierOwner: true }),
    ).toBe(true);
    expect(canManageMember(Role.OWNER, Role.MANAGER)).toBe(true);
    expect(canManageMember(Role.MANAGER, Role.CASHIER)).toBe(true);
    expect(canManageMember(Role.MANAGER, Role.MANAGER)).toBe(false);
  });
});
