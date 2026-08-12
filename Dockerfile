# syntax=docker/dockerfile:1

# ── deps: install against the bun lockfile ──
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
# --ignore-scripts: the root postinstall runs scripts/copy-monaco.ts, which
# isn't present in this stage; the builder reruns it after COPY . .
RUN bun install --frozen-lockfile --ignore-scripts

# ── builder: produce the standalone server (.next/standalone) ──
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Regenerate the Monaco assets that postinstall would have copied into
# public/ (kept out of the build context by .dockerignore).
RUN bun scripts/copy-monaco.ts
# src/server/env.ts validates env AT IMPORT and throws, and `next build`
# imports the server modules — so the build needs these two present (the rest
# have defaults; BETTER_AUTH_URL must sit on the default ROOT_DOMAIN,
# localhost:3000). They are build-time placeholders ONLY: this app has no
# NEXT_PUBLIC_* vars, so nothing is inlined into the output; the real values
# are injected at runtime via docker-compose's env_file.
ENV NODE_ENV=production \
    BETTER_AUTH_SECRET="insecure-build-time-placeholder-32-chars-min" \
    BETTER_AUTH_URL="http://localhost:3000"
RUN bun run build

# ── runner: minimal production image ──
FROM oven/bun:1-alpine AS runner
WORKDIR /app
# su-exec: docker-entrypoint.sh starts as root to chown the data volume, then
# drops to bun for migrations and the server.
RUN apk add --no-cache su-exec
# HOSTNAME=0.0.0.0 is required so the server is reachable through the published
# port. The container always listens on PORT=3000; the host-facing port is set
# via HOST_PORT in docker-compose (nothing overrides PORT here).
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
# The standalone output already bundles a pruned node_modules; these three
# pieces are what it does not self-contain.
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/public ./public
# src/server/db/index.ts loads drizzle-orm/bun-sqlite through createRequire
# with a computed specifier (so Turbopack won't bundle it) — Next's file
# tracing can't see that either, so overlay the full package into the pruned
# node_modules. drizzle-orm has no runtime deps of its own.
COPY --from=deps --chown=bun:bun /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
# The entrypoint applies these migrations against the data volume on every
# start, before the server begins listening.
COPY --chown=bun:bun drizzle ./drizzle
COPY --chown=bun:bun scripts/migrate.ts ./scripts/migrate.ts
COPY docker-entrypoint.sh ./
RUN mkdir -p data
# Informational only — the real published port is set by compose from .env.
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
