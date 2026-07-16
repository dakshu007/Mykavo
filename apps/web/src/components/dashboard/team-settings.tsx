"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";
import type { WorkspaceRole } from "@mykavo/database";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  canChangeRoles,
  canManageMembers,
  canRemoveMember,
  INVITABLE_ROLES,
  type InvitableRole,
} from "@/lib/team";
import { cn } from "@/lib/utils";

/**
 * Team card on /dashboard/settings: members, pending invites, and the invite
 * form. Every action here is re-checked server-side (spec §39) — this
 * component reads the same role matrix (lib/team) purely for display.
 */

export interface TeamMemberView {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  /** Pre-formatted joined date. */
  joined: string;
}

export interface PendingInviteView {
  id: string;
  email: string;
  role: WorkspaceRole;
  /** Pre-formatted expiry date. */
  expires: string;
  /** Present only for OWNER/ADMIN viewers. */
  acceptUrl?: string;
}

const ROLE_CHIP: Record<WorkspaceRole, string> = {
  OWNER: "bg-ink text-ink-inverse",
  ADMIN: "bg-primary-soft text-primary",
  MEMBER: "bg-ink/5 text-ink-secondary",
  VIEWER: "bg-ink/5 text-ink-faint",
};

function roleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function RoleChip({ role }: { role: WorkspaceRole }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        ROLE_CHIP[role],
      )}
    >
      {roleLabel(role)}
    </span>
  );
}

export function TeamSettings({
  members,
  invites,
  currentUserId,
  currentRole,
  maxMembers,
  isFreePlan,
}: {
  members: TeamMemberView[];
  invites: PendingInviteView[];
  currentUserId: string;
  currentRole: WorkspaceRole;
  maxMembers: number;
  isFreePlan: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("MEMBER");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const manager = canManageMembers(currentRole);
  const used = members.length + invites.length;
  const seatsLeft = used < maxMembers;

  async function call(key: string, input: RequestInfo, init: RequestInit) {
    if (busy) return;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const res = await fetch(input, init);
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return false;
      }
      router.refresh();
      return true;
    } catch {
      setError("Something went wrong. Please try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    const ok = await call("invite", "/api/workspace/invites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    if (ok) {
      setNotice(`Invitation sent to ${email.trim().toLowerCase()}.`);
      setEmail("");
      setRole("MEMBER");
    }
  }

  async function copyLink(invite: PendingInviteView) {
    if (!invite.acceptUrl) return;
    try {
      await navigator.clipboard.writeText(invite.acceptUrl);
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Couldn't copy the link.");
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-ink-secondary">
        {used} of {maxMembers} seat{maxMembers === 1 ? "" : "s"} used
        {invites.length > 0 && (
          <span className="text-ink-faint"> (pending invites hold a seat)</span>
        )}
      </p>

      <ul className="divide-y divide-line">
        {members.map((m) => {
          const isSelf = m.userId === currentUserId;
          const removable = manager && !isSelf && canRemoveMember(currentRole, m.role);
          const roleEditable =
            canChangeRoles(currentRole) && m.role !== "OWNER" && !isSelf;
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <span
                aria-hidden
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-sm font-semibold text-ink"
              >
                {(m.name || m.email).charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink">
                    {m.name}
                    {isSelf && <span className="text-ink-faint"> (you)</span>}
                  </span>
                  <RoleChip role={m.role} />
                </span>
                <span className="block truncate text-[12px] text-ink-secondary">
                  {m.email} · joined {m.joined}
                </span>
              </span>
              {roleEditable && (
                <label className="shrink-0">
                  <span className="sr-only">Role for {m.email}</span>
                  <select
                    value={m.role}
                    disabled={busy !== null}
                    onChange={(e) =>
                      call(`role-${m.id}`, `/api/workspace/members/${m.id}`, {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ role: e.target.value }),
                      })
                    }
                    className="h-8 cursor-pointer rounded-full border border-line bg-card px-2.5 text-[12px] font-medium text-ink-secondary focus:border-primary focus:outline-none disabled:opacity-60"
                  >
                    {INVITABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {removable && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() =>
                    call(`remove-${m.id}`, `/api/workspace/members/${m.id}`, {
                      method: "DELETE",
                    })
                  }
                  className="shrink-0 text-critical-strong hover:bg-critical-soft hover:text-critical-strong"
                >
                  {busy === `remove-${m.id}` && (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  )}
                  Remove
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {invites.length > 0 && (
        <div>
          <p className="mb-2 text-[13px] font-medium text-ink">Pending invitations</p>
          <ul className="divide-y divide-line">
            {invites.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm text-ink">{inv.email}</span>
                    <RoleChip role={inv.role} />
                  </span>
                  <span className="block text-[12px] text-ink-faint">
                    expires {inv.expires}
                  </span>
                </span>
                {manager && inv.acceptUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyLink(inv)}
                    className="shrink-0"
                  >
                    {copiedId === inv.id ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : (
                      <Copy className="size-3.5" aria-hidden />
                    )}
                    {copiedId === inv.id ? "Copied" : "Copy link"}
                  </Button>
                )}
                {manager && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      call(`revoke-${inv.id}`, `/api/workspace/invites/${inv.id}`, {
                        method: "DELETE",
                      })
                    }
                    className="shrink-0 text-critical-strong hover:bg-critical-soft hover:text-critical-strong"
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {manager &&
        (isFreePlan ? (
          <div className="rounded-tile bg-surface px-4 py-3.5">
            <p className="text-sm text-ink">
              Team members are a Pro feature. Upgrade to invite up to 5 teammates with
              Admin, Member, or Viewer roles.
            </p>
            <ButtonLink href="/dashboard/billing" size="sm" className="mt-3">
              Upgrade to Pro
            </ButtonLink>
          </div>
        ) : (
          <form onSubmit={sendInvite} className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 basis-52">
              <span className="mb-1.5 block text-[13px] font-medium text-ink">
                Invite by email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@agency.com"
                disabled={!seatsLeft}
                className="h-10 w-full rounded-field border border-line bg-card px-3.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none disabled:opacity-60"
              />
            </label>
            <label className="shrink-0">
              <span className="sr-only">Role</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as InvitableRole)}
                disabled={!seatsLeft}
                className="h-10 cursor-pointer rounded-field border border-line bg-card px-3 text-sm text-ink focus:border-primary focus:outline-none disabled:opacity-60"
              >
                {INVITABLE_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" size="sm" disabled={busy !== null || !seatsLeft} className="h-10">
              {busy === "invite" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Send invite
            </Button>
            {!seatsLeft && (
              <p className="w-full text-[12px] text-ink-faint">
                All seats are in use — remove a member or revoke an invite to free one up.
              </p>
            )}
          </form>
        ))}

      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}
      {notice && <p className="text-sm text-success-strong">{notice}</p>}
    </div>
  );
}
