"use client";

import { TEAM_ROLE_BADGE_STYLES } from "@/components/team/team-constants";
import { Badge } from "@/components/ui/badge";
import { formatEnumLabel } from "@/lib/formatters";
import type { TeamRoleCard } from "@/lib/team-types";

type TeamRolesTabProps = {
  roles: TeamRoleCard[];
};

export function TeamRolesTab({ roles }: TeamRolesTabProps) {
  return (
    <div className="space-y-4">
      {roles.map((role) => (
        <div key={role.role} className="rounded-xl border bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge
                  className={TEAM_ROLE_BADGE_STYLES[role.role]}
                  variant="outline"
                >
                  {formatEnumLabel(role.role)}
                </Badge>
                <Badge variant="outline">Tier {role.tier}</Badge>
                <Badge variant="outline">{role.memberCount} assigned</Badge>
              </div>
              <h3 className="text-lg font-semibold">{role.summary}</h3>
              <p className="max-w-3xl text-sm text-muted-foreground">
                {role.description}
              </p>
            </div>
            <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              Read-only
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {role.permissions.map((permission) => (
              <Badge key={permission} variant="outline">
                {permission === "*" ? "Wildcard access" : permission}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
