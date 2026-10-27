# MyKavo scan worker - container image.
#
# Built to run the worker anywhere Docker runs (Oracle Cloud Always Free ARM,
# Hetzner, any VPS) instead of only on the owner's Mac, where a closed lid
# stops monitoring for every customer at once.
#
# Base is the OFFICIAL Playwright image, pinned to the exact playwright
# version in pnpm-lock.yaml. The bundled browsers and the npm package are
# version-locked to each other: bumping playwright in the lockfile without
# bumping this tag gives "Executable doesn't exist" at runtime. Multi-arch,
# so the same Dockerfile builds on arm64 (Oracle Ampere) and x86.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

# UTC everywhere: scan stabilization and screenshot capture require a fixed
# timezone (spec §17), and every cron in the worker is written in UTC.
ENV TZ=UTC \
    NODE_ENV=production \
    # Browsers ship inside the image; never re-download them during install.
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Postgres 17 binaries for the nightly backup (apps/worker/src/db-backup.ts):
# pg_dump to take it, and a server to prove it restores. From the PGDG apt
# repo because Ubuntu noble ships 16, and pg_dump refuses a newer server
# (Supabase runs 17). No cluster is created and no server runs at boot - the
# restore check starts a throwaway one on a unix socket and deletes it after.
# Wrapped so an unreachable package mirror can never block a worker deploy:
# monitoring matters more than backups. If it fails, the worker emails the
# operators every night that backups are off (BACKUPS_REQUIRED in compose).
RUN ( apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl \
 && install -d /usr/share/postgresql-common/pgdg \
 && curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
      https://www.postgresql.org/media/keys/ACCC4CF8.asc \
 && echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] https://apt.postgresql.org/pub/repos/apt noble-pgdg main" \
      > /etc/apt/sources.list.d/pgdg.list \
 && apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql-common \
 && sed -ri 's/#(create_main_cluster) .*$/\1 = false/' /etc/postgresql-common/createcluster.conf \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends postgresql-17 postgresql-client-17 \
 ) || echo "WARNING: Postgres 17 install failed - database backups disabled in this image" ; \
 rm -rf /var/lib/apt/lists/*

# Persistent worker data (backups now, more later) lives on a named volume
# mounted here by compose.yml. Created and owned in the image so the volume
# inherits pwuser ownership the first time Docker populates it.
RUN mkdir -p /data && chown pwuser:pwuser /data

WORKDIR /app

# pnpm via corepack, pinned to the repo's packageManager field.
RUN corepack enable && corepack prepare pnpm@10.18.3 --activate

# Manifests first so a code-only change reuses the cached install layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# apps/web is copied MANIFEST-ONLY. pnpm --frozen-lockfile validates the
# lockfile against every workspace member, so omitting web's package.json
# fails the install outright ("lockfile is not up to date"). The --filter
# below still keeps Next and its dependencies out of the image.
# apps/mobile is excluded by pnpm-workspace.yaml, so it is not needed here.
COPY apps/web/package.json                    apps/web/
COPY apps/worker/package.json                 apps/worker/
COPY packages/database/package.json           packages/database/
COPY packages/scanner/package.json            packages/scanner/
COPY packages/shared/package.json             packages/shared/
COPY packages/comparison-engine/package.json  packages/comparison-engine/
COPY packages/severity-engine/package.json    packages/severity-engine/
COPY packages/email/package.json              packages/email/
COPY packages/seo-audit/package.json          packages/seo-audit/

# The web app is not part of this image - the worker only needs its own
# workspace deps, and installing Next here would triple the image size.
RUN pnpm install --frozen-lockfile \
      --filter worker... \
      --filter @mykavo/database...

COPY packages/ packages/
COPY apps/worker/ apps/worker/

# "native" in schema.prisma resolves to the engine for THIS architecture, so
# generating inside the container is what makes arm64 work.
RUN pnpm --filter @mykavo/database exec prisma generate

# SECURITY: run as the image's non-root user so Chromium keeps its OS
# sandbox. packages/scanner/src/lighthouse.ts refuses --no-sandbox on
# purpose - the pages being scanned are untrusted and this process holds
# database and R2 credentials. compose.yml supplies Playwright's seccomp
# profile so the sandbox can create user namespaces without root.
RUN chown -R pwuser:pwuser /app
USER pwuser

# tsx runs the TypeScript directly - matches how the Mac worker runs, so
# there is no build step to drift out of sync.
CMD ["pnpm", "--filter", "worker", "start"]
