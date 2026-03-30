import * as React from "react";

import { useApiClient } from "@/hooks/use-api";
import { type components } from "@/lib/api-types";

type LocationDto = components["schemas"]["LocationDto"];

type UseLocationsOptions = {
  enabled?: boolean;
  initialLocations?: LocationDto[];
};

export function useLocations(options: UseLocationsOptions = {}) {
  const { enabled = true, initialLocations = [] } = options;
  const apiClient = useApiClient();
  const [locations, setLocations] =
    React.useState<LocationDto[]>(initialLocations);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const nextLocations: LocationDto[] = [];
      let cursor: string | undefined;

      do {
        const { data } = await apiClient.GET("/locations", {
          params: {
            query: {
              limit: 100,
              cursor,
              status: "ACTIVE",
              sortBy: "name",
              sortOrder: "asc",
            },
          },
        });

        nextLocations.push(...(data?.data ?? []));
        cursor = data?.nextCursor ?? undefined;
      } while (cursor);

      if (!cancelled) {
        setLocations(nextLocations);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiClient, enabled]);

  return locations;
}
