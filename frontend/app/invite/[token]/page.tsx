import { InviteAcceptancePage } from "@/components/team/invite-acceptance-page";

export default async function InviteTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <InviteAcceptancePage token={token} />;
}
