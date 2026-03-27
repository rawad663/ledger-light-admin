"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { useApiClient } from "@/hooks/use-api";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  customer: { id: string; name: string } | null;
};

export function DeleteCustomerDialog({
  open,
  onOpenChange,
  onSuccess,
  customer,
}: Props) {
  const apiClient = useApiClient();
  const [deleting, setDeleting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) setApiError(null);
  }, [open]);

  async function handleDelete() {
    if (!customer) return;

    setDeleting(true);
    setApiError(null);

    const { error } = await apiClient.DELETE("/customers/{id}", {
      params: { path: { id: customer.id } },
    });

    setDeleting(false);

    if (error) {
      setApiError((error as any)?.message ?? "Failed to delete customer");
      return;
    }

    onOpenChange(false);
    onSuccess?.();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete customer?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-medium text-foreground">
              {customer?.name}
            </span>{" "}
            and all associated data. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {apiError && (
          <p className="text-sm text-destructive">{apiError}</p>
        )}

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
