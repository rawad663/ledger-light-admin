import { Role } from '@prisma/generated/enums';

export const ROLE_TIER: Record<Role, number> = {
  OWNER: 1,
  MANAGER: 2,
  CASHIER: 3,
  SUPPORT: 3,
  INVENTORY_CLERK: 3,
};

export function canAssignRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === Role.OWNER) {
    return true;
  }

  return ROLE_TIER[actorRole] < ROLE_TIER[targetRole];
}

export function canManageMember(
  actorRole: Role,
  targetRole: Role,
  options?: { allowSameTierOwner?: boolean },
): boolean {
  if (actorRole === Role.OWNER && targetRole !== Role.OWNER) {
    return true;
  }

  if (actorRole === Role.OWNER && targetRole === Role.OWNER) {
    return options?.allowSameTierOwner ?? false;
  }

  return ROLE_TIER[actorRole] < ROLE_TIER[targetRole];
}
