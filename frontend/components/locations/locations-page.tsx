"use client";

import {
  Archive,
  Download,
  MapPin,
  MoreHorizontal,
  Plus,
  Warehouse,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CreateLocationForm } from "@/components/locations/create-location-form";
import { DeleteLocationDialog } from "@/components/locations/delete-location-dialog";
import { EditLocationForm } from "@/components/locations/edit-location-form";
import { PageHeader } from "@/components/shared/page-header";
import { PageSearchInput } from "@/components/shared/page-search-input";
import { PaginationFooter } from "@/components/shared/pagination-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import { useApiClient } from "@/hooks/use-api";
import { useCursorPagination } from "@/hooks/use-cursor-pagination";
import { toast } from "@/hooks/use-toast";
import { useUrlSearch } from "@/hooks/use-url-search";
import { type components } from "@/lib/api-types";
import { formatEnumLabel, formatLocationAddress } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type LocationListItem = components["schemas"]["LocationListItemDto"];
type LocationDto = components["schemas"]["LocationDto"];

const LOCATION_TYPE_OPTIONS = ["STORE", "WAREHOUSE", "POP_UP", "OTHER"] as const;
const LOCATION_STATUS_OPTIONS = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

const LOCATION_STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-success/15 text-success border-success/30",
  INACTIVE: "bg-warning/15 text-warning-foreground border-warning/30",
  ARCHIVED: "bg-muted text-muted-foreground border-muted",
};

export const LOCATIONS_PAGE_LIMIT = 50;

type LocationsPageProps = {
  locations: LocationListItem[];
  total: number;
  nextCursor?: string;
  initialSearch: string;
  totalLocationsCount: number;
  activeLocationsCount: number;
  archivedLocationsCount: number;
};

export function LocationsPage({
  locations: initialLocations,
  total: initialTotal,
  nextCursor: initialNextCursor,
  initialSearch,
  totalLocationsCount,
  activeLocationsCount,
  archivedLocationsCount,
}: LocationsPageProps) {
  const apiClient = useApiClient();
  const router = useRouter();
  const { searchParams, searchInput, setSearchInput, updateParams } =
    useUrlSearch(initialSearch);
  const [isCreateFormOpen, setIsCreateFormOpen] = React.useState(false);
  const [locationBeingEdited, setLocationBeingEdited] =
    React.useState<LocationDto | null>(null);
  const [locationBeingDeleted, setLocationBeingDeleted] = React.useState<{
    id: string;
    name: string;
  } | null>(null);

  const search = searchParams.get("search") ?? "";
  const typeFilter = searchParams.get("type") ?? "all";
  const statusFilter = searchParams.get("status") ?? "all";

  const {
    data: locations,
    total,
    hasNext,
    hasPrevious,
    refresh,
    goNext,
    goPrevious,
    showingFrom,
    showingTo,
    loading,
  } = useCursorPagination<LocationListItem>({
    initialData: initialLocations,
    initialTotal,
    initialNextCursor,
    limit: LOCATIONS_PAGE_LIMIT,
    filterKey: `${search}|${typeFilter}|${statusFilter}`,
    fetchPage: React.useCallback(
      async (cursor?: string) => {
        const { data } = await apiClient.GET("/locations", {
          params: {
            query: {
              limit: LOCATIONS_PAGE_LIMIT,
              cursor,
              search: search || undefined,
              type: typeFilter === "all" ? undefined : typeFilter,
              status: statusFilter === "all" ? undefined : statusFilter,
              sortBy: "updatedAt",
              sortOrder: "desc",
            },
          },
        });

        return {
          data: data?.data ?? [],
          totalCount: data?.totalCount ?? 0,
          nextCursor: data?.nextCursor ?? undefined,
        };
      },
      [apiClient, search, statusFilter, typeFilter],
    ),
  });

  const handleMutationSuccess = React.useCallback(async () => {
    await refresh();
    router.refresh();
  }, [refresh, router]);

  const handleArchiveLocation = React.useCallback(
    async (location: LocationListItem) => {
      const { error } = await apiClient.PATCH("/locations/{id}", {
        params: { path: { id: location.id } },
        body: { status: "ARCHIVED" },
      });

      if (error) {
        toast({
          title: "Could not archive location",
          description:
            (error as Error)?.message ??
            "Cannot archive a location with inventory on hand.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Location archived",
        description: `${location.name} was moved out of the operational list.`,
      });
      await handleMutationSuccess();
    },
    [apiClient, handleMutationSuccess],
  );

  async function handleEditLocation(locationId: string) {
    const { data, error } = await apiClient.GET("/locations/{id}", {
      params: { path: { id: locationId } },
    });

    if (error || !data) {
      toast({
        title: "Could not load location",
        description:
          (error as Error)?.message ?? "Failed to load this location.",
        variant: "destructive",
      });
      return;
    }

    setLocationBeingEdited(data);
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Locations"
        description="Manage operational locations and keep inventory scoped to real places."
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="mr-1.5 size-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setIsCreateFormOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Add Location
            </Button>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Total Locations</p>
            <p className="text-3xl font-semibold">{totalLocationsCount}</p>
            <p className="text-sm text-muted-foreground">
              All locations in this organization
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Active Locations</p>
            <p className="text-3xl font-semibold">{activeLocationsCount}</p>
            <p className="text-sm text-muted-foreground">
              Currently available for operations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Archived Locations</p>
            <p className="text-3xl font-semibold">{archivedLocationsCount}</p>
            <p className="text-sm text-muted-foreground">
              Preserved for history and audit trails
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <PageSearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search by name, code, address, or city..."
        />
        <Select
          value={typeFilter}
          onValueChange={(value) => updateParams({ type: value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {LOCATION_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>
                {formatEnumLabel(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => updateParams({ status: value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Operational Default</SelectItem>
            {LOCATION_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {formatEnumLabel(status)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("rounded-lg border bg-card", loading && "opacity-60")}>
        {locations.length === 0 ? (
          <div className="py-16">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MapPin />
                </EmptyMedia>
                <EmptyTitle>No locations found</EmptyTitle>
                <EmptyDescription>
                  {search || typeFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your search or filters."
                    : "Create your first location to make inventory and operational reporting feel grounded."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {search || typeFilter !== "all" || statusFilter !== "all" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchInput("");
                      updateParams({ search: "", status: "", type: "" });
                    }}
                  >
                    Clear filters
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => setIsCreateFormOpen(true)}>
                    <Plus className="mr-1.5 size-4" />
                    Add Location
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[260px]">Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{location.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {location.code ? `Code: ${location.code}` : "No code"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatEnumLabel(location.type)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={LOCATION_STATUS_STYLES[location.status]}
                      >
                        {formatEnumLabel(location.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[360px] text-muted-foreground">
                      {formatLocationAddress(location)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {location.onHandQuantity}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/inventory?locationId=${location.id}`}>
                              <Warehouse className="mr-2 size-4" />
                              View Inventory
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleEditLocation(location.id)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={location.status === "ARCHIVED"}
                            onClick={() => handleArchiveLocation(location)}
                          >
                            <Archive className="mr-2 size-4" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setLocationBeingDeleted({
                                id: location.id,
                                name: location.name,
                              })
                            }
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <PaginationFooter
              showingFrom={showingFrom}
              showingTo={showingTo}
              total={total}
              hasNext={hasNext}
              hasPrevious={hasPrevious}
              onNext={goNext}
              onPrevious={goPrevious}
            />
          </>
        )}
      </div>

      <CreateLocationForm
        open={isCreateFormOpen}
        onOpenChange={setIsCreateFormOpen}
        onSuccess={handleMutationSuccess}
      />

      <EditLocationForm
        open={Boolean(locationBeingEdited)}
        onOpenChange={(open) => {
          if (!open) {
            setLocationBeingEdited(null);
          }
        }}
        onSuccess={async () => {
          setLocationBeingEdited(null);
          await handleMutationSuccess();
        }}
        location={locationBeingEdited}
      />

      <DeleteLocationDialog
        open={Boolean(locationBeingDeleted)}
        onOpenChange={(open) => {
          if (!open) {
            setLocationBeingDeleted(null);
          }
        }}
        onSuccess={async () => {
          setLocationBeingDeleted(null);
          await handleMutationSuccess();
        }}
        location={locationBeingDeleted}
      />
    </div>
  );
}
