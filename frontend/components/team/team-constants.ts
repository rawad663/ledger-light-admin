import type { MembershipStatus, TeamRole } from "@/lib/team-types";

export const TEAM_PAGE_LIMIT = 50;

export const TEAM_ROLE_OPTIONS = [
  "OWNER",
  "MANAGER",
  "CASHIER",
  "SUPPORT",
  "INVENTORY_CLERK",
] as const satisfies readonly TeamRole[];

export const TEAM_STATUS_OPTIONS = [
  "ACTIVE",
  "INVITED",
  "DEACTIVATED",
] as const satisfies readonly MembershipStatus[];

export const TEAM_ROLE_BADGE_STYLES: Record<TeamRole, string> = {
  OWNER: "bg-slate-900 text-white border-slate-900",
  MANAGER: "bg-sky-100 text-sky-700 border-sky-200",
  CASHIER: "bg-emerald-100 text-emerald-700 border-emerald-200",
  SUPPORT: "bg-amber-100 text-amber-700 border-amber-200",
  INVENTORY_CLERK: "bg-violet-100 text-violet-700 border-violet-200",
};
