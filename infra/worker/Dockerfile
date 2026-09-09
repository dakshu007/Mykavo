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
