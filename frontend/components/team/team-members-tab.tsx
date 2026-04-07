"use client";

import { MoreHorizontal } from "lucide-react";

import { PageSearchInput } from "@/components/shared/page-search-input";
import { PaginationFooter } from "@/components/shared/pagination-footer";
import {
  TEAM_ROLE_BADGE_STYLES,
  TEAM_ROLE_OPTIONS,
  TEAM_STATUS_OPTIONS,
} from "@/components/team/team-constants";
import { TeamStatCard } from "@/components/team/team-stat-card";
import { getTeamLocationSummary } from "@/components/team/team-utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEnumLabel, getInitials } from "@/lib/formatters";
import { TEAM_MEMBERSHIP_STATUS_STYLES } from "@/lib/status";
import { canManageMember } from "@/lib/team-access";
import type {
  TeamMemberListItem,
  TeamMemberStats,
  TeamRole,
} from "@/lib/team-types";
import { cn } from "@/lib/utils";

import { formatRelativeActivity } from "./team-utils";

type TeamMembersTabProps = {
  members: TeamMemberListItem[];
  stats: TeamMemberStats;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
  showingFrom: number;
  showingTo: number;
  loading: boolean;
  searchInput: string;
  roleFilter: string;
  statusFilter: string;
  currentRole: string | null;
  currentUserId: string | null;
  setSearchInput: (value: string) => void;
  updateParams: (updates: Record<string, string>) => void;
  onNext: () => void | Promise<void>;
  onPrevious: () => void | Promise<void>;
  onSelectMember: (membershipId: string) => void | Promise<void>;
  onResendInvite: (member: TeamMemberListItem) => Promise<void>;
  onReactivate: (member: TeamMemberListItem) => Promise<void>;
};

export function TeamMembersTab({
  members,
  stats,
  total,
  hasNext,
  hasPrevious,
  showingFrom,
  showingTo,
  loading,
  searchInput,
  roleFilter,
  statusFilter,
  currentRole,
  currentUserId,
  setSearchInput,
  updateParams,
  onNext,
  onPrevious,
  onSelectMember,
  onResendInvite,
  onReactivate,
}: TeamMembersTabProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <TeamStatCard
          label="Active members"
          value={stats.activeMembers}
          tone="emerald"
        />
        <TeamStatCard
          label="Pending invites"
          value={stats.pendingInvites}
          tone="amber"
        />
        <TeamStatCard
          label="Deactivated"
          value={stats.deactivatedMembers}
          tone="slate"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PageSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by member name or email..."
        />
        <Select
          value={roleFilter}
          onValueChange={(value) => updateParams({ role: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {TEAM_ROLE_OPTIONS.map((role) => (
              <SelectItem key={role} value={role}>
                {formatEnumLabel(role)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(value) => updateParams({ status: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Active + invited</SelectItem>
            {TEAM_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {formatEnumLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("rounded-lg border bg-card", loading && "opacity-60")}>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead>Locations</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-28 text-center text-sm text-muted-foreground"
                >
                  No team members match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              members.map((member) => (
                <TableRow
                  key={member.membershipId}
                  className="cursor-pointer"
                  onClick={() => void onSelectMember(member.membershipId)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-9">
                        <AvatarFallback
                          className={cn(
                            "text-xs",
                            TEAM_ROLE_BADGE_STYLES[member.role],
                          )}
                        >
                          {getInitials(member.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.displayName}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={TEAM_ROLE_BADGE_STYLES[member.role]}
                      variant="outline"
                    >
                      {formatEnumLabel(member.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        className={TEAM_MEMBERSHIP_STATUS_STYLES[member.status]}
                        variant="outline"
                      >
                        {formatEnumLabel(member.status)}
                      </Badge>
                      {member.inviteExpired ? (
                        <Badge
                          variant="outline"
                          className="border-amber-200 text-amber-700"
                        >
                          Expired
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatRelativeActivity(member.lastActiveAt)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {getTeamLocationSummary(member)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            void onSelectMember(member.membershipId)
                          }
                        >
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {member.status === "INVITED" ? (
                          <DropdownMenuItem
                            onClick={() => void onResendInvite(member)}
                          >
                            Resend invite
                          </DropdownMenuItem>
                        ) : null}
                        {member.status === "DEACTIVATED" ? (
                          <DropdownMenuItem
                            onClick={() => void onReactivate(member)}
                          >
                            Reactivate
                          </DropdownMenuItem>
                        ) : null}
                        {(currentRole === "OWNER" ||
                          canManageMember(currentRole, member.role as TeamRole)) &&
                        member.userId !== currentUserId ? (
                          <DropdownMenuItem
                            onClick={() =>
                              void onSelectMember(member.membershipId)
                            }
                          >
                            Manage member
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <PaginationFooter
          showingFrom={showingFrom}
          showingTo={showingTo}
          total={total}
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          onNext={onNext}
          onPrevious={onPrevious}
        />
      </div>
    </div>
  );
}
