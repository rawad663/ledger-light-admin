"use client";

import { CheckCircle2, Clock3, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { getTeamApiErrorMessage } from "@/components/team/team-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useApiClient } from "@/hooks/use-api";
import { useUser } from "@/hooks/use-user";
import { formatEnumLabel } from "@/lib/formatters";
import type {
  AcceptInvitationResponse,
  InvitationResolution,
} from "@/lib/team-types";

type InviteAcceptancePageProps = {
  token: string;
};

export function InviteAcceptancePage({ token }: InviteAcceptancePageProps) {
  const authenticatedApiClient = useApiClient();
  const publicApiClient = useApiClient(false);
  const currentUser = useUser();
  const [resolution, setResolution] =
    React.useState<InvitationResolution | null>(null);
  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [accepted, setAccepted] =
    React.useState<AcceptInvitationResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [sessionRefreshWarning, setSessionRefreshWarning] =
    React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    publicApiClient
      .POST("/team/invitations/resolve", {
        body: { token },
      })
      .then(({ data, error }) => {
        if (!cancelled) {
          if (error || !data) {
            setError(
              getTeamApiErrorMessage(error, "We couldn't resolve this invite"),
            );
            return;
          }

          setError(null);
          setResolution(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError((requestError as Error).message);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [publicApiClient, token]);

  const acceptingWithAuthenticatedAccount = Boolean(
    resolution?.member &&
      !resolution.requiresPassword &&
      currentUser?.user.id === resolution.member.userId,
  );

  async function acceptInvite() {
    setSubmitting(true);
    setError(null);
    setSessionRefreshWarning(null);

    const { data, error } = await authenticatedApiClient.POST(
      "/team/invitations/accept",
      {
        body: {
          token,
          ...(resolution?.requiresPassword ? { password } : {}),
        },
      },
    );

    setSubmitting(false);

    if (error || !data) {
      setError(getTeamApiErrorMessage(error, "We couldn't accept this invite"));
      return;
    }

    if (acceptingWithAuthenticatedAccount) {
      try {
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
        });

        if (!refreshResponse.ok) {
          const body = await refreshResponse.json().catch(() => ({}));
          setSessionRefreshWarning(
            getTeamApiErrorMessage(
              body,
              "Invitation accepted, but we couldn't refresh your session. Reload the app to see the new organization.",
            ),
          );
        }
      } catch (refreshError) {
        setSessionRefreshWarning(
          getTeamApiErrorMessage(
            refreshError,
            "Invitation accepted, but we couldn't refresh your session. Reload the app to see the new organization.",
          ),
        );
      }
    }

    setAccepted(data as AcceptInvitationResponse);
  }

  const requiresExistingAccountLogin = Boolean(
    resolution?.member &&
    !resolution.requiresPassword &&
    currentUser?.user.id !== resolution.member.userId,
  );
  const returnTo = `/invite/${token}`;

  if (accepted) {
    return (
      <InviteShell>
        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold">Invite accepted</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {acceptingWithAuthenticatedAccount
              ? `${accepted.member.displayName} can now access ${resolution?.organizationName ?? "this organization"} from your org switcher.`
              : `${accepted.member.displayName} now has access to ${
                  accepted.member.hasAllLocations
                    ? "all organization locations"
                    : `${accepted.member.locations.length} assigned locations`
                }.`}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Badge variant="outline">
              {formatEnumLabel(accepted.member.role)}
            </Badge>
            <Badge variant="outline">
              {formatEnumLabel(accepted.member.status)}
            </Badge>
          </div>
          {sessionRefreshWarning ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {sessionRefreshWarning}
            </p>
          ) : null}
          <Button asChild className="mt-6">
            <Link href={acceptingWithAuthenticatedAccount ? "/" : "/login"}>
              {acceptingWithAuthenticatedAccount
                ? "Continue to app"
                : "Continue to login"}
            </Link>
          </Button>
        </div>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ShieldCheck className="size-4" />
          Team invitation
        </div>

        {!resolution && !error ? (
          <div className="py-10 text-sm text-muted-foreground">
            Resolving invite...
          </div>
        ) : error ? (
          <InviteState
            title="We couldn't resolve this invite"
            description={error}
            tone="error"
          />
        ) : resolution?.status === "INVALID" ? (
          <InviteState
            title="This invite link is invalid"
            description="The invitation token could not be found. Request a new invite from your organization admin."
            tone="error"
          />
        ) : resolution?.status === "EXPIRED" ? (
          <InviteState
            title="This invite has expired"
            description="Ask an owner or manager to resend a fresh invitation link."
            tone="warning"
          />
        ) : resolution?.member ? (
          <>
            <h1 className="mt-4 text-2xl font-semibold">
              Join {resolution.organizationName}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {resolution.member.email} was invited as{" "}
              <span className="font-medium text-foreground">
                {formatEnumLabel(resolution.member.role)}
              </span>
              . {resolution.roleDescription}
            </p>

            <div className="mt-6 rounded-xl border bg-muted/40 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {formatEnumLabel(resolution.member.role)}
                </Badge>
                <Badge variant="outline">
                  {resolution.member.hasAllLocations
                    ? "All locations"
                    : `${resolution.member.locations.length} locations`}
                </Badge>
                {resolution.member.status === "INVITED" ? (
                  <Badge variant="outline">Pending activation</Badge>
                ) : null}
              </div>

              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="size-4" />
                  {resolution.member.email}
                </div>
                <div className="flex items-center gap-2">
                  <Clock3 className="size-4" />
                  {resolution.member.hasAllLocations
                    ? "Access to all locations"
                    : resolution.member.locations
                        .map((location) => location.name)
                        .join(", ")}
                </div>
              </div>
            </div>

            {resolution.requiresPassword ? (
              <div className="mt-6 space-y-3">
                <div>
                  <p className="text-sm font-medium">Set your password</p>
                  <p className="text-sm text-muted-foreground">
                    Your account will activate as soon as you accept the invite.
                  </p>
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimum 8 characters"
                />
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
                This invite is linked to an existing account. Log in as{" "}
                <span className="font-medium">{resolution.member.email}</span>{" "}
                before accepting it.
              </div>
            )}

            {error ? (
              <p className="mt-4 text-sm text-destructive">{error}</p>
            ) : null}

            <div className="mt-6 flex items-center gap-3">
              {requiresExistingAccountLogin ? (
                <Button asChild>
                  <Link
                    href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
                  >
                    Log in to accept
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={() => void acceptInvite()}
                  disabled={
                    submitting ||
                    (resolution.requiresPassword && password.length < 8)
                  }
                >
                  {submitting ? "Accepting..." : "Accept invitation"}
                </Button>
              )}
              <Button asChild variant="outline">
                <Link href="/login">Go to login</Link>
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </InviteShell>
  );
}

function InviteState({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: "warning" | "error";
}) {
  const classes =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : "border-rose-200 bg-rose-50 text-rose-800";

  return (
    <div className={`mt-6 rounded-xl border p-4 ${classes}`}>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm">{description}</p>
    </div>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.14),_transparent_35%),linear-gradient(180deg,_#f8fafc,_#eef2f7)] px-4 py-16">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}
