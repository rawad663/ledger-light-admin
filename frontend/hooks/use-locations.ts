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

    apiClient
      .GET("/locations", {
        params: {
          query: {
            limit: 100,
            status: "ACTIVE",
            sortBy: "name",
            sortOrder: "asc",
          },
        },
      })
      .then(({ data }) => {
        if (!cancelled) {
          setLocations(data?.data ?? []);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [apiClient, enabled]);

  return locations;
}
