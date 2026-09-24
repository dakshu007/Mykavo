-- Connections from CMS plugins (the MyKavo WordPress plugin) to one website.
--
-- The plugin connects with an OAuth-style handshake: a workspace member
-- approves on mykavo.app, the plugin receives a one-time code and trades it
-- (with a PKCE verifier) for an access token scoped to this one website.
-- Only SHA-256 hashes of the code and the token are stored.

CREATE TABLE "site_connection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "websiteId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "siteUrl" TEXT NOT NULL,
    "siteName" TEXT,
    "createdByUserId" TEXT,
    "codeHash" TEXT,
    "codeChallenge" TEXT,
    "codeExpiresAt" TIMESTAMP(3),
    "tokenHash" TEXT,
    "tokenPrefix" TEXT,
    "connectedAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "pluginVersion" TEXT,
    "platformVersion" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_connection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "site_connection_codeHash_key" ON "site_connection"("codeHash");
CREATE UNIQUE INDEX "site_connection_tokenHash_key" ON "site_connection"("tokenHash");
CREATE INDEX "site_connection_workspaceId_idx" ON "site_connection"("workspaceId");
CREATE INDEX "site_connection_websiteId_idx" ON "site_connection"("websiteId");

ALTER TABLE "site_connection"
    ADD CONSTRAINT "site_connection_workspaceId_fkey"
    FOREIGN KEY ("workspaceId") REFERENCES "workspace"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Deleting the website removes its connections: a token must never outlive
-- the only thing it was allowed to see.
ALTER TABLE "site_connection"
    ADD CONSTRAINT "site_connection_websiteId_fkey"
    FOREIGN KEY ("websiteId") REFERENCES "website"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- SetNull: a connection keeps working if the member who approved it leaves.
ALTER TABLE "site_connection"
    ADD CONSTRAINT "site_connection_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "user"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS, matching every other table (see apps/worker/src/scripts/enable-rls.ts).
ALTER TABLE "site_connection" ENABLE ROW LEVEL SECURITY;
