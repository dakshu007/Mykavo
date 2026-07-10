-- Workspace invites (multi-user workspaces — spec WorkspaceMember roles).
-- Email invitations into a workspace: token is the only entry path (24 random
-- bytes, base64url), invites expire after 7 days, acceptedAt marks
-- consumption. OWNER is never an invitable role (enforced in code — a
-- workspace has exactly one owner).

-- CreateTable
CREATE TABLE "workspace_invite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workspace_invite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_invite_token_key" ON "workspace_invite"("token");

-- CreateIndex
CREATE INDEX "workspace_invite_workspaceId_idx" ON "workspace_invite"("workspaceId");

-- One live (unaccepted) invite per email per workspace. Partial unique index
-- (not expressible in Prisma schema — same pattern as the single-ACTIVE
-- baseline invariant); accepted invites stay as history without blocking
-- future re-invites after a member is removed.
CREATE UNIQUE INDEX "workspace_invite_pending_email_key"
    ON "workspace_invite"("workspaceId", "email")
    WHERE "acceptedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_invite" ADD CONSTRAINT "workspace_invite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
