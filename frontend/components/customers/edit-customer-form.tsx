"use client";

import * as React from "react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { useApiClient } from "@/hooks/use-api";
import { type components } from "@/lib/api-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

type CustomerDetail = components["schemas"]["CustomerDetailDto"];

const CUSTOMER_STATUSES = ["ACTIVE", "INACTIVE", "BLOCKED"] as const;

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  BLOCKED: "Blocked",
};

const editCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  internalNote: z.string().optional(),
});

type FormValues = z.infer<typeof editCustomerSchema>;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  customer: CustomerDetail | null;
};

export function EditCustomerForm({
  open,
  onOpenChange,
  onSuccess,
  customer,
}: Props) {
  const apiClient = useApiClient();
  const [submitting, setSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(editCustomerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      status: "ACTIVE",
      internalNote: "",
    },
  });

  // Reset form with customer values when opened
  React.useEffect(() => {
    if (open && customer) {
      form.reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone ?? "",
        status: (customer.status as unknown as string) || "ACTIVE",
        internalNote: customer.internalNote ?? "",
      });
      setApiError(null);
    }
  }, [open, customer, form]);

  async function onSubmit(values: FormValues) {
    if (!customer) return;

    setSubmitting(true);
    setApiError(null);

    const body = {
      name: values.name,
      email: values.email,
      phone: values.phone || null,
      status: values.status,
      internalNote: values.internalNote || null,
    };

    const { data, error, response } = await apiClient.PATCH("/customers/{id}", {
      params: { path: { id: customer.id } },
      body: body as any,
    });

    setSubmitting(false);

    if (error) {
      const message =
        (error as Error)?.message ??
        (response.status === 409
          ? "A customer with this email already exists"
          : "Failed to update customer");
      setApiError(message);
      return;
    }

    if (data) {
      onOpenChange(false);
      onSuccess?.();
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Edit Customer</SheetTitle>
          <SheetDescription>Update customer information.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="customer@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="555-555-5555" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CUSTOMER_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="internalNote"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Note (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes visible only to your team..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {apiError && <p className="text-sm text-destructive">{apiError}</p>}

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-1.5 size-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
