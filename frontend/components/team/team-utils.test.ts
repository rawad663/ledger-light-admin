import { describe, expect, it } from "vitest";

import {
  buildOptimisticInviteMember,
  formatRelativeActivity,
  getAssignableTeamLocations,
  getTeamApiErrorMessage,
  getTeamLocationSummary,
  getUnavailableTeamLocationIds,
  mergeTeamLocationOptions,
} from "@/components/team/team-utils";

describe("team-utils", () => {
  it("formats relative activity across common time ranges", () => {
    const now = new Date("2026-04-07T12:00:00.000Z").getTime();

    expect(formatRelativeActivity(null, now)).toBe("Never");
    expect(formatRelativeActivity("2026-04-07T12:00:00.000Z", now)).toBe(
      "Active now",
    );
    expect(formatRelativeActivity("2026-04-07T11:40:00.000Z", now)).toBe(
      "20m ago",
    );
    expect(formatRelativeActivity("2026-04-07T09:00:00.000Z", now)).toBe(
      "3h ago",
    );
    expect(formatRelativeActivity("2026-04-04T12:00:00.000Z", now)).toBe(
      "3d ago",
    );
  });

  it("summarizes scoped and all-location access", () => {
    expect(
      getTeamLocationSummary({
        hasAllLocations: true,
        locations: [],
      }),
    ).toBe("All locations");

    expect(
      getTeamLocationSummary({
        hasAllLocations: false,
        locations: [{ id: "loc-1", name: "Downtown" }],
      }),
    ).toBe("Downtown");

    expect(
      getTeamLocationSummary({
        hasAllLocations: false,
        locations: [
          { id: "loc-1", name: "Downtown" },
          { id: "loc-2", name: "North" },
        ],
      }),
    ).toBe("2 locations");
  });

  it("builds optimistic invite members from form input", () => {
    const member = buildOptimisticInviteMember({
      email: "casey@example.com",
      role: "MANAGER",
      locationIds: ["loc-2"],
      availableLocations: [
        { id: "loc-1", name: "Downtown", status: "ACTIVE" },
        { id: "loc-2", name: "North", status: "ACTIVE" },
      ],
    });

    expect(member.email).toBe("casey@example.com");
    expect(member.role).toBe("MANAGER");
    expect(member.status).toBe("INVITED");
    expect(member.hasAllLocations).toBe(false);
    expect(member.locations).toEqual([{ id: "loc-2", name: "North" }]);
  });

  it("keeps inactive assigned locations removable without making them assignable", () => {
    const mergedLocations = mergeTeamLocationOptions(
      [
        { id: "loc-1", name: "Downtown", status: "ACTIVE" },
        { id: "loc-2", name: "North", status: "INACTIVE" },
      ],
      [{ id: "loc-3", name: "Legacy" }],
    );

    expect(getAssignableTeamLocations(mergedLocations)).toEqual([
      { id: "loc-1", name: "Downtown", status: "ACTIVE" },
    ]);
    expect(getUnavailableTeamLocationIds(mergedLocations)).toEqual([
      "loc-2",
      "loc-3",
    ]);
  });

  it("falls back when api errors do not expose a message", () => {
    expect(getTeamApiErrorMessage(new Error("Boom"), "Fallback")).toBe("Boom");
    expect(
      getTeamApiErrorMessage({ message: "Structured error" }, "Fallback"),
    ).toBe("Structured error");
    expect(getTeamApiErrorMessage(null, "Fallback")).toBe("Fallback");
  });
});
