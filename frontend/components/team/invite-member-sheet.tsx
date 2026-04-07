"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";

import {
  TEAM_ROLE_BADGE_STYLES,
  TEAM_ROLE_OPTIONS,
} from "@/components/team/team-constants";
import {
  buildOptimisticInviteMember,
  getAssignableTeamLocations,
  getTeamApiErrorMessage,
} from "@/components/team/team-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useApiClient } from "@/hooks/use-api";
import { toast } from "@/hooks/use-toast";
import { formatEnumLabel } from "@/lib/formatters";
import { canAssignRole } from "@/lib/team-access";
import type {
  InviteMemberInput,
  TeamLocationOption,
  TeamMemberListItem,
  TeamRole,
  TeamRoleCard,
} from "@/lib/team-types";

import { TeamLocationScopeField } from "./team-location-scope-field";

const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  role: z.enum(TEAM_ROLE_OPTIONS),
  locationIds: z.array(z.string()).default([]),
});

type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

type InviteMemberSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableLocations: TeamLocationOption[];
  currentRole: string | null;
  roles: TeamRoleCard[];
  onInvited: (member: TeamMemberListItem) => Promise<void>;
  onOptimistic: (member: TeamMemberListItem) => void;
  onRollback: () => void;
};

function getDefaultInviteRole(
  currentRole: string | null,
  fallbackRole: TeamRole = "CASHIER",
) {
  return (
    TEAM_ROLE_OPTIONS.find((role) => canAssignRole(currentRole, role)) ??
    fallbackRole
  );
}

export function InviteMemberSheet({
  open,
  onOpenChange,
  availableLocations,
  currentRole,
  roles,
  onInvited,
  onOptimistic,
  onRollback,
}: InviteMemberSheetProps) {
  const apiClient = useApiClient();
  const [submitting, setSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const allowedRoles = React.useMemo(
    () => TEAM_ROLE_OPTIONS.filter((role) => canAssignRole(currentRole, role)),
    [currentRole],
  );
  const assignableLocations = React.useMemo(
    () => getAssignableTeamLocations(availableLocations),
    [availableLocations],
  );
  const defaultRole = React.useMemo(
    () => getDefaultInviteRole(currentRole),
    [currentRole],
  );

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: defaultRole,
      locationIds: [],
    },
  });

  const selectedRole = useWatch({
    control: form.control,
    name: "role",
  });
  const roleInfo = roles.find((item) => item.role === selectedRole);

  React.useEffect(() => {
    if (!open) {
      form.reset({
        email: "",
        role: defaultRole,
        locationIds: [],
      });
      setApiError(null);
    }
  }, [defaultRole, form, open]);

  React.useEffect(() => {
    const currentSelectedRole = form.getValues("role");

    if (
      allowedRoles.length > 0 &&
      !allowedRoles.includes(currentSelectedRole)
    ) {
      form.setValue("role", allowedRoles[0], { shouldDirty: false });
    }
  }, [allowedRoles, form]);

  async function onSubmit(values: InviteMemberFormValues) {
    const optimisticMember = buildOptimisticInviteMember({
      email: values.email,
      role: values.role,
      locationIds: values.locationIds,
      availableLocations: assignableLocations,
    });

    onOptimistic(optimisticMember);
    setSubmitting(true);
    setApiError(null);

    const body: InviteMemberInput = {
      email: values.email,
      role: values.role,
      locationIds:
        values.locationIds.length > 0 ? values.locationIds : undefined,
    };

    const { data, error, response } = await apiClient.POST("/team/invite", {
      body,
    });

    setSubmitting(false);

    if (error || !data) {
      onRollback();
      setApiError(
        getTeamApiErrorMessage(
          error,
          response.status === 409
            ? "That email already has organization access or a pending invite."
            : "Failed to send the invitation",
        ),
      );
      return;
    }

    toast({
      title: "Invite sent",
      description:
        data.inviteUrl ??
        `${data.member.displayName} was added with invited status.`,
    });

    await onInvited(data.member);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">Invite member</SheetTitle>
          <SheetDescription>
            Add a new team member with a role and optional location scope.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="person@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allowedRoles.map((role) => (
                        <SelectItem key={role} value={role}>
                          {formatEnumLabel(role)}
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
              name="locationIds"
              render={({ field }) => (
                <FormItem>
                  <TeamLocationScopeField
                    label="Location access"
                    description="Leave everything unchecked to give access to all locations you can assign."
                    availableLocations={assignableLocations}
                    selectedLocationIds={field.value}
                    onChange={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {roleInfo ? (
              <div className="rounded-xl border bg-muted/40 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Permission summary</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge
                    className={TEAM_ROLE_BADGE_STYLES[roleInfo.role]}
                    variant="outline"
                  >
                    {formatEnumLabel(roleInfo.role)}
                  </Badge>
                  {roleInfo.permissions.map((permission) => (
                    <Badge key={permission} variant="outline">
                      {permission === "*" ? "Wildcard access" : permission}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {apiError ? (
              <p className="text-sm text-destructive">{apiError}</p>
            ) : null}

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
                Send invite
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
