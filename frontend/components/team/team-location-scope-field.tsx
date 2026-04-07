"use client";

import { Checkbox } from "@/components/ui/checkbox";
import type { TeamLocationOption } from "@/lib/team-types";
import { cn } from "@/lib/utils";

type TeamLocationScopeFieldProps = {
  label: string;
  description: string;
  availableLocations: TeamLocationOption[];
  selectedLocationIds: string[];
  onChange: (locationIds: string[]) => void;
  unavailableLocationIds?: string[];
  disabled?: boolean;
};

export function TeamLocationScopeField({
  label,
  description,
  availableLocations,
  selectedLocationIds,
  onChange,
  unavailableLocationIds = [],
  disabled = false,
}: TeamLocationScopeFieldProps) {
  const unavailableLocationIdSet = new Set(unavailableLocationIds);

  if (availableLocations.length === 0) {
    return (
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          No active locations are available yet.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2 rounded-xl border p-3">
        {availableLocations.map((location) => {
          const checked = selectedLocationIds.includes(location.id);
          const isUnavailable = unavailableLocationIdSet.has(location.id);
          const isCheckboxDisabled = disabled || (isUnavailable && !checked);

          return (
            <label
              key={location.id}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted/60"
            >
              <div className="flex flex-col">
                <span
                  className={cn(
                    "text-sm",
                    isCheckboxDisabled && "text-muted-foreground",
                  )}
                >
                  {location.name}
                </span>
                {isUnavailable ? (
                  <span className="text-xs text-muted-foreground">
                    {checked
                      ? "Unavailable for new assignments. Uncheck to remove it."
                      : "Unavailable"}
                  </span>
                ) : null}
              </div>
              <Checkbox
                checked={checked}
                disabled={isCheckboxDisabled}
                onCheckedChange={(nextChecked) => {
                  onChange(
                    nextChecked
                      ? [...selectedLocationIds, location.id]
                      : selectedLocationIds.filter(
                          (item) => item !== location.id,
                        ),
                  );
                }}
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
