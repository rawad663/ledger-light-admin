import { AppShell } from "@/components/app-shell";
import { LocationsPage } from "@/components/locations/locations-page";
import { createApi } from "@/lib/api";
import { components } from "@/lib/api-types";

type LocationStatus = components["schemas"]["LocationDto"]["status"];
type LocationType = components["schemas"]["LocationDto"]["type"];

export default async function Locations({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; type?: string }>;
}) {
  const { search, status, type } = await searchParams;
  const api = await createApi();
  const [
    { data },
    { data: activeData },
    { data: archivedData },
    { data: operationalData },
  ] = await Promise.all([
    api.GET("/locations", {
      params: {
        query: {
          limit: 50,
          search,
          status: status === "all" ? undefined : (status as LocationStatus),
          type: type === "all" ? undefined : (type as LocationType),
        },
      },
    }),
    api.GET("/locations", {
      params: {
        query: {
          limit: 1, // limit 1 cause we case about totalCount
          status: "ACTIVE",
        },
      },
    }),
    api.GET("/locations", {
      params: {
        query: {
          limit: 1, // limit 1 cause we case about totalCount
          status: "ARCHIVED",
        },
      },
    }),
    api.GET("/locations", {
      params: {
        query: {
          limit: 1, // limit 1 cause we case about totalCount
        },
      },
    }),
  ]);

  const activeLocationsCount = activeData?.totalCount ?? 0;
  const archivedLocationsCount = archivedData?.totalCount ?? 0;
  const nonArchivedCount = operationalData?.totalCount ?? 0;

  return (
    <AppShell>
      <LocationsPage
        locations={data?.data ?? []}
        total={data?.totalCount ?? 0}
        nextCursor={data?.nextCursor}
        initialSearch={search ?? ""}
        totalLocationsCount={nonArchivedCount + archivedLocationsCount}
        activeLocationsCount={activeLocationsCount}
        archivedLocationsCount={archivedLocationsCount}
      />
    </AppShell>
  );
}
