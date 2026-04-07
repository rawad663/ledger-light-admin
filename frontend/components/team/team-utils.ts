import type {
  TeamLocation,
  TeamLocationOption,
  TeamMemberListItem,
  TeamRole,
} from "@/lib/team-types";

export function formatRelativeActivity(
  value?: string | null,
  now: number = Date.now(),
) {
  if (!value) {
    return "Never";
  }

  const diffMs = now - new Date(value).getTime();
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0);

  if (diffMinutes < 1) {
    return "Active now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function getTeamLocationSummary(member: {
  hasAllLocations: boolean;
  locations: TeamLocation[];
}) {
  if (member.hasAllLocations) {
    return "All locations";
  }

  if (member.locations.length === 1) {
    return member.locations[0].name;
  }

  return `${member.locations.length} locations`;
}

export function getAssignableTeamLocations(
  availableLocations: TeamLocationOption[],
): TeamLocationOption[] {
  return availableLocations.filter(
    (location) =>
      location.status === undefined || location.status === "ACTIVE",
  );
}

export function mergeTeamLocationOptions(
  availableLocations: TeamLocationOption[],
  assignedLocations: TeamLocation[],
): TeamLocationOption[] {
  const locations = new Map(
    availableLocations.map((location) => [location.id, location]),
  );

  for (const location of assignedLocations) {
    if (!locations.has(location.id)) {
      locations.set(location.id, {
        ...location,
        status: "ARCHIVED",
      });
    }
  }

  return [...locations.values()];
}

export function getUnavailableTeamLocationIds(
  availableLocations: TeamLocationOption[],
): string[] {
  return availableLocations
    .filter(
      (location) =>
        location.status !== undefined && location.status !== "ACTIVE",
    )
    .map((location) => location.id);
}

export function getTeamApiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return fallback;
}

export function buildOptimisticInviteMember(args: {
  email: string;
  role: TeamRole;
  locationIds: string[];
  availableLocations: TeamLocationOption[];
}): TeamMemberListItem {
  const timestamp = new Date().toISOString();
  const optimisticId = `optimistic-${Date.now()}`;

  return {
    membershipId: optimisticId,
    userId: optimisticId,
    displayName: args.email,
    email: args.email,
    role: args.role,
    status: "INVITED",
    lastActiveAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    hasAllLocations: args.locationIds.length === 0,
    locations: args.availableLocations
      .filter((location) => args.locationIds.includes(location.id))
      .map((location) => ({
        id: location.id,
        name: location.name,
      })),
    inviteExpired: false,
  };
}
