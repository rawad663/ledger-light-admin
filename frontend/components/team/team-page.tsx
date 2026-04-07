"use client";

import { UserPlus } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/shared/page-header";
import { InviteMemberSheet } from "@/components/team/invite-member-sheet";
import { TeamConfirmationDialog } from "@/components/team/team-confirmation-dialog";
import {
  TEAM_PAGE_LIMIT,
  TEAM_ROLE_OPTIONS,
  TEAM_STATUS_OPTIONS,
} from "@/components/team/team-constants";
import { TeamMemberSheet } from "@/components/team/team-member-sheet";
import { TeamMembersTab } from "@/components/team/team-members-tab";
import { TeamRolesTab } from "@/components/team/team-roles-tab";
import { getTeamApiErrorMessage } from "@/components/team/team-utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApiClient } from "@/hooks/use-api";
import { useAuth } from "@/hooks/use-auth";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { toast } from "@/hooks/use-toast";
import { useUrlSearch } from "@/hooks/use-url-search";
import { formatEnumLabel } from "@/lib/formatters";
import { canAccessTeam } from "@/lib/team-access";
import type {
  MembershipStatus,
  TeamLocationOption,
  TeamMemberDetail,
  TeamMemberListItem,
  TeamMembersResponse,
  TeamMutationResponse,
  TeamRole,
  TeamRoleCard,
  UpdateTeamMemberInput,
} from "@/lib/team-types";

type TeamPageProps = {
  initialMembers: TeamMembersResponse;
  initialRoles: TeamRoleCard[];
  initialLocations: TeamLocationOption[];
  initialCurrentRole: string | null;
  initialSearch: string;
  initialStatus: string;
  initialRole: string;
};

export function TeamPage({
  initialMembers,
  initialRoles,
  initialLocations,
  initialCurrentRole,
  initialSearch,
  initialStatus,
  initialRole,
}: TeamPageProps) {
  const apiClient = useApiClient();
  const { user, currentOrg, currentRole } = useAuth();
  const hasHydrated = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { searchParams, searchInput, setSearchInput, updateParams } =
    useUrlSearch(initialSearch);

  const [stats, setStats] = React.useState(initialMembers.stats);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [selectedMemberId, setSelectedMemberId] = React.useState<string | null>(
    null,
  );
  const [selectedMember, setSelectedMember] =
    React.useState<TeamMemberDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [pendingDeactivate, setPendingDeactivate] =
    React.useState<TeamMemberDetail | null>(null);
  const [pendingRoleChange, setPendingRoleChange] = React.useState<{
    member: TeamMemberDetail;
    nextRole: TeamRole;
  } | null>(null);
  const [optimisticInvite, setOptimisticInvite] =
    React.useState<TeamMemberListItem | null>(null);
  const [deactivatingMember, setDeactivatingMember] = React.useState(false);
  const [updatingRole, setUpdatingRole] = React.useState(false);
  const effectiveCurrentRole = hasHydrated ? currentRole : initialCurrentRole;

  const search = searchParams.get("search") ?? "";
  const statusFilter = searchParams.get("status") ?? initialStatus;
  const roleFilter = searchParams.get("role") ?? initialRole;
  const normalizedRoleFilter = TEAM_ROLE_OPTIONS.includes(roleFilter as TeamRole)
    ? (roleFilter as TeamRole)
    : undefined;
  const normalizedStatusFilter = TEAM_STATUS_OPTIONS.includes(
    statusFilter as MembershipStatus,
  )
    ? (statusFilter as MembershipStatus)
    : undefined;

  const fetchMembers = React.useCallback(
    async (cursor?: string) => {
      const { data, error } = await apiClient.GET("/team", {
        params: {
          query: {
            limit: TEAM_PAGE_LIMIT,
            cursor,
            search: search || undefined,
            status: normalizedStatusFilter,
            role: normalizedRoleFilter,
            sortBy: "updatedAt",
            sortOrder: "desc",
          },
        },
      });

      if (error || !data) {
        throw new Error(getTeamApiErrorMessage(error, "Could not load team members"));
      }

      setStats(data.stats);

      return {
        data: data.data,
        totalCount: data.totalCount,
        nextCursor: data.nextCursor,
      };
    },
    [apiClient, normalizedRoleFilter, normalizedStatusFilter, search],
  );

  const {
    data: members,
    total,
    hasNext,
    hasPrevious,
    goNext,
    goPrevious,
    refresh,
    showingFrom,
    showingTo,
    loading,
  } = useCursorPagination<TeamMemberListItem>({
    initialData: initialMembers.data,
    initialTotal: initialMembers.totalCount,
    initialNextCursor: initialMembers.nextCursor,
    limit: TEAM_PAGE_LIMIT,
    filterKey: [search, statusFilter, roleFilter],
    fetchPage: fetchMembers,
  });

  const renderedMembers = React.useMemo(() => {
    if (!optimisticInvite) {
      return members;
    }

    return [
      optimisticInvite,
      ...members.filter((member) => member.email !== optimisticInvite.email),
    ];
  }, [members, optimisticInvite]);

  async function loadMemberDetail(membershipId: string) {
    if (!currentOrg?.id) {
      return;
    }

    setSelectedMemberId(membershipId);
    setLoadingDetail(true);

    try {
      const { data, error } = await apiClient.GET("/team/{membershipId}", {
        params: {
          path: { membershipId },
        },
      });

      if (error || !data) {
        throw new Error(getTeamApiErrorMessage(error, "Could not load member"));
      }

      setSelectedMember(data);
    } catch (error) {
      setSelectedMemberId(null);
      setSelectedMember(null);
      toast({
        title: "Could not load member",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function syncMutation(response: TeamMutationResponse) {
    if (selectedMemberId && response.member.membershipId === selectedMemberId) {
      setSelectedMember(response.member);
    }

    try {
      await refresh();
    } catch {
      toast({
        title: "Changes saved",
        description: "The member was updated, but the list could not refresh.",
        variant: "destructive",
      });
    }

    return response;
  }

  async function requestUpdateMemberProfile(
    member: TeamMemberDetail,
    values: UpdateTeamMemberInput,
  ) {
    const { data, error, response } = await apiClient.PATCH("/team/{membershipId}", {
      params: {
        path: { membershipId: member.membershipId },
      },
      body: values,
    });

    if (error || !data) {
      throw new Error(
        getTeamApiErrorMessage(
          error,
          response.status === 409
            ? "That email is already in use by another account."
            : "Could not update profile",
        ),
      );
    }

    await syncMutation(data);
  }

  async function requestUpdateMemberLocations(
    member: TeamMemberDetail,
    locationIds: string[],
  ) {
    const { data, error } = await apiClient.PATCH("/team/{membershipId}/locations", {
      params: {
        path: { membershipId: member.membershipId },
      },
      body: {
        locationIds,
      },
    });

    if (error || !data) {
      throw new Error(
        getTeamApiErrorMessage(error, "Could not update location access"),
      );
    }

    await syncMutation(data);
  }

  async function requestResendInvite(member: TeamMemberListItem | TeamMemberDetail) {
    const { data, error } = await apiClient.POST("/team/{membershipId}/resend-invite", {
      params: {
        path: { membershipId: member.membershipId },
      },
    });

    if (error || !data) {
      throw new Error(getTeamApiErrorMessage(error, "Could not resend invite"));
    }

    return syncMutation(data);
  }

  async function requestReactivateMember(
    member: TeamMemberListItem | TeamMemberDetail,
  ) {
    const { data, error } = await apiClient.POST("/team/{membershipId}/reactivate", {
      params: {
        path: { membershipId: member.membershipId },
      },
    });

    if (error || !data) {
      throw new Error(getTeamApiErrorMessage(error, "Could not reactivate member"));
    }

    await syncMutation(data);
  }

  async function requestDeactivateMember(member: TeamMemberDetail) {
    const { data, error } = await apiClient.POST("/team/{membershipId}/deactivate", {
      params: {
        path: { membershipId: member.membershipId },
      },
    });

    if (error || !data) {
      throw new Error(getTeamApiErrorMessage(error, "Could not deactivate member"));
    }

    await syncMutation(data);
  }

  async function requestChangeMemberRole(
    member: TeamMemberDetail,
    nextRole: TeamRole,
  ) {
    const { data, error } = await apiClient.PATCH("/team/{membershipId}/role", {
      params: {
        path: { membershipId: member.membershipId },
      },
      body: {
        role: nextRole,
      },
    });

    if (error || !data) {
      throw new Error(getTeamApiErrorMessage(error, "Could not update role"));
    }

    await syncMutation(data);
  }

  async function handleResendInviteFromList(
    member: TeamMemberListItem,
  ) {
    try {
      const response = await requestResendInvite(member);
      toast({
        title: "Invite resent",
        description:
          response.inviteUrl ?? "A new invitation link was generated.",
      });
    } catch (error) {
      toast({
        title: "Could not resend invite",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  async function handleReactivateFromList(
    member: TeamMemberListItem,
  ) {
    try {
      await requestReactivateMember(member);
      toast({
        title: "Member reactivated",
        description: `${member.displayName} can access the organization again.`,
      });
    } catch (error) {
      toast({
        title: "Could not reactivate member",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }

  if (!canAccessTeam(effectiveCurrentRole)) {
    return (
      <div className="space-y-6 p-6">
        <PageHeader
          title="Team"
          description="Manage memberships, roles, and location-scoped access."
        />
        <div className="rounded-xl border bg-card p-8">
          <h2 className="text-lg font-semibold">
            You don&apos;t have access to Team management.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Team management is available to Owners and Managers only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Team"
        description="Invite, manage, and review team members with role-based access and optional location scoping."
        actions={
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1.5 size-4" />
            Invite member
          </Button>
        }
      />

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <TeamMembersTab
            members={renderedMembers}
            stats={stats}
            total={total}
            hasNext={hasNext}
            hasPrevious={hasPrevious}
            showingFrom={showingFrom}
            showingTo={showingTo}
            loading={loading}
            searchInput={searchInput}
            roleFilter={roleFilter}
            statusFilter={statusFilter}
            currentRole={effectiveCurrentRole}
            currentUserId={user?.id ?? null}
            setSearchInput={setSearchInput}
            updateParams={updateParams}
            onNext={goNext}
            onPrevious={goPrevious}
            onSelectMember={loadMemberDetail}
            onResendInvite={handleResendInviteFromList}
            onReactivate={handleReactivateFromList}
          />
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          <TeamRolesTab roles={initialRoles} />
        </TabsContent>
      </Tabs>

      <InviteMemberSheet
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        availableLocations={initialLocations}
        currentRole={effectiveCurrentRole}
        roles={initialRoles}
        onInvited={async (member) => {
          setOptimisticInvite(member);
          try {
            await refresh();
          } catch {
            toast({
              title: "Invite sent",
              description: "The new member was added, but the list could not refresh.",
              variant: "destructive",
            });
          }
          setOptimisticInvite(null);
        }}
        onOptimistic={(member) => setOptimisticInvite(member)}
        onRollback={() => setOptimisticInvite(null)}
      />

      <TeamMemberSheet
        open={Boolean(selectedMemberId)}
        member={selectedMember}
        loading={loadingDetail}
        currentRole={effectiveCurrentRole}
        currentUserId={user?.id ?? null}
        availableLocations={initialLocations}
        roles={initialRoles}
        onClose={() => {
          setSelectedMemberId(null);
          setSelectedMember(null);
        }}
        onSaveProfile={requestUpdateMemberProfile}
        onSaveLocations={requestUpdateMemberLocations}
        onRequestDeactivate={(member) => setPendingDeactivate(member)}
        onRequestRoleChange={(member, nextRole) =>
          setPendingRoleChange({ member, nextRole })
        }
        onResendInvite={async (member) => {
          const response = await requestResendInvite(member);
          toast({
            title: "Invite resent",
            description:
              response.inviteUrl ??
              `${member.displayName} now has a refreshed invite link.`,
          });
        }}
        onReactivate={async (member) => {
          await requestReactivateMember(member);
          toast({
            title: "Member reactivated",
            description: `${member.displayName} can sign in again.`,
          });
        }}
      />

      <TeamConfirmationDialog
        open={Boolean(pendingDeactivate)}
        onOpenChange={(open) => !open && setPendingDeactivate(null)}
        title="Deactivate member"
        description={
          pendingDeactivate
            ? `Deactivate ${pendingDeactivate.displayName}? This revokes their active sessions and keeps the record for audit history.`
            : ""
        }
        confirmLabel="Deactivate"
        confirmVariant="destructive"
        confirming={deactivatingMember}
        onConfirm={() => {
          if (!pendingDeactivate) {
            return;
          }

          setDeactivatingMember(true);

          void requestDeactivateMember(pendingDeactivate)
            .then(() => {
              toast({
                title: "Member deactivated",
                description: `${pendingDeactivate.displayName} no longer has access.`,
              });
              setPendingDeactivate(null);
              setSelectedMember(null);
              setSelectedMemberId(null);
            })
            .catch((error) => {
              toast({
                title: "Could not deactivate member",
                description: (error as Error).message,
                variant: "destructive",
              });
            })
            .finally(() => {
              setDeactivatingMember(false);
            });
        }}
      />

      <TeamConfirmationDialog
        open={Boolean(pendingRoleChange)}
        onOpenChange={(open) => !open && setPendingRoleChange(null)}
        title="Confirm role change"
        description={
          pendingRoleChange
            ? `Change ${pendingRoleChange.member.displayName} to ${formatEnumLabel(
                pendingRoleChange.nextRole,
              )}? This immediately updates their permission set.`
            : ""
        }
        confirmLabel="Confirm"
        confirming={updatingRole}
        onConfirm={() => {
          if (!pendingRoleChange) {
            return;
          }

          setUpdatingRole(true);

          void requestChangeMemberRole(
            pendingRoleChange.member,
            pendingRoleChange.nextRole,
          )
            .then(() => {
              toast({
                title: "Role updated",
                description: `${pendingRoleChange.member.displayName} is now ${formatEnumLabel(
                  pendingRoleChange.nextRole,
                )}.`,
              });
              setPendingRoleChange(null);
            })
            .catch((error) => {
              toast({
                title: "Could not update role",
                description: (error as Error).message,
                variant: "destructive",
              });
            })
            .finally(() => {
              setUpdatingRole(false);
            });
        }}
      />
    </div>
  );
}
