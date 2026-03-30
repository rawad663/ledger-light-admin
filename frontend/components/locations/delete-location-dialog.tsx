"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useApiClient } from "@/hooks/use-api";

type DeleteLocationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  location: { id: string; name: string } | null;
};

export function DeleteLocationDialog({
  open,
  onOpenChange,
  onSuccess,
  location,
}: DeleteLocationDialogProps) {
  const apiClient = useApiClient();
  const [deleting, setDeleting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setApiError(null);
    }
  }, [open]);

  async function handleDelete() {
    if (!location) return;

    setDeleting(true);
    setApiError(null);

    const { error } = await apiClient.DELETE("/locations/{id}", {
      params: { path: { id: location.id } },
    });

    setDeleting(false);

    if (error) {
      setApiError((error as Error)?.message ?? "Failed to delete location");
      return;
    }

    onOpenChange(false);
    onSuccess?.();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete location?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove{" "}
            <span className="font-medium text-foreground">
              {location?.name}
            </span>
            . Deletion is blocked if this is the only location in the
            organization, if inventory is still on hand, or if the location has
            order history.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {apiError && <p className="text-sm text-destructive">{apiError}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
