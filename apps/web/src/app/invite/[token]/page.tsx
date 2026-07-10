import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@fluxen/database";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { InviteAcceptButton } from "@/components/invite-accept-button";
import { getSession } from "@/lib/session";
import { emailsMatch, isInviteUsable } from "@/lib/team";

export const metadata: Metadata = {
  title: "Workspace invitation",
  description: "Join a Fluxen workspace.",
  robots: { index: false },
};

function roleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

/**
 * Public landing page for a workspace invitation. The unguessable token is
 * the only identifier; acceptance itself is enforced server-side (session +
 * email match) by POST /api/invites/[token]/accept.
 */
export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invite, session] = await Promise.all([
    prisma.workspaceInvite.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true } },
        invitedBy: { select: { name: true } },
      },
    }),
    getSession(),
  ]);

  const nextPath = `/invite/${encodeURIComponent(token)}`;
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;
  const signupHref = `/signup?next=${encodeURIComponent(nextPath)}`;

  let body: React.ReactNode;

  if (!invite) {
    body = (
      <>
        <h1 className="mb-2 text-xl font-semibold tracking-tight text-ink">
          Invitation not found
        </h1>
        <p className="mb-6 text-sm text-ink-secondary">
          This invitation link isn&apos;t valid. Ask your teammate to send a new one.
        </p>
        <ButtonLink href="/" variant="secondary">
          Go to Fluxen
        </ButtonLink>
      </>
    );
  } else if (!isInviteUsable(invite)) {
    const used = invite.acceptedAt !== null;
    body = (
      <>
        <h1 className="mb-2 text-xl font-semibold tracking-tight text-ink">
          {used ? "Invitation already used" : "Invitation expired"}
        </h1>
        <p className="mb-6 text-sm text-ink-secondary">
          {used
            ? "This invitation has already been accepted."
            : "Invitations expire after 7 days."}{" "}
          Ask {invite.invitedBy.name} to send a new invitation to join{" "}
          <span className="font-medium text-ink">{invite.workspace.name}</span>.
        </p>
        <ButtonLink href="/dashboard" variant="secondary">
          Go to dashboard
        </ButtonLink>
      </>
    );
  } else {
    const intro = (
      <>
        <p className="mb-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-primary">
          Workspace invitation
        </p>
        <h1 className="mb-2 text-xl font-semibold tracking-tight text-ink">
          Join {invite.workspace.name}
        </h1>
        <p className="mb-6 text-sm text-ink-secondary">
          {invite.invitedBy.name} invited you to join{" "}
          <span className="font-medium text-ink">{invite.workspace.name}</span> as a{" "}
          {roleLabel(invite.role)}.
        </p>
      </>
    );

    if (!session) {
      body = (
        <>
          {intro}
          <p className="mb-4 text-sm text-ink-secondary">
            Sign in or create a free account with{" "}
            <span className="font-medium text-ink">{invite.email}</span> to accept.
          </p>
          <div className="flex flex-col gap-2">
            <ButtonLink href={loginHref}>Sign in to accept</ButtonLink>
            <ButtonLink href={signupHref} variant="secondary">
              Create an account
            </ButtonLink>
          </div>
        </>
      );
    } else if (!emailsMatch(invite.email, session.user.email)) {
      body = (
        <>
          {intro}
          <p className="mb-6 text-sm text-ink-secondary">
            This invitation was sent to{" "}
            <span className="font-medium text-ink">{invite.email}</span>, but
            you&apos;re signed in as{" "}
            <span className="font-medium text-ink">{session.user.email}</span>. Sign in
            with the invited email to accept, or ask {invite.invitedBy.name} to invite
            this address instead.
          </p>
          <ButtonLink href={loginHref} variant="secondary">
            Sign in with a different account
          </ButtonLink>
        </>
      );
    } else {
      body = (
        <>
          {intro}
          <InviteAcceptButton token={token} workspaceName={invite.workspace.name} />
        </>
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link href="/" aria-label="Fluxen home" className="mb-8 inline-flex">
        <Logo markSize={30} className="gap-2.5" wordmarkClassName="text-xl" />
      </Link>
      <div className="w-full max-w-100 rounded-card bg-card p-8 shadow-card">{body}</div>
      <p className="mt-6 text-[13px] text-ink-faint">Know what changed. Fix what matters.</p>
    </div>
  );
}
