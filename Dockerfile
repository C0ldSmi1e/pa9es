# syntax=docker/dockerfile:1

# ── deps: install against the bun lockfile ──
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
# --ignore-scripts: the root postinstall runs scripts/copy-monaco.ts, which
# isn't present in this stage; the builder reruns it after COPY . .
RUN bun install --frozen-lockfile --ignore-scripts

# ── builder: produce the standalone server (.next/standalone) ──
# The compose `migrate` service also runs this stage (it has scripts/migrate.ts
# and the drizzle/ migrations), as user bun against the shared data volume.
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
# Pre-create the data mountpoint owned by bun so the named volume inherits
# writable ownership no matter which service touches it first.
RUN mkdir -p data && chown bun:bun data

# ── runner: minimal production image ──
FROM oven/bun:1-alpine AS runner
WORKDIR /app
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
# SQLite lives on the data volume mounted here; bun-owned so the app can write.
RUN mkdir -p data && chown bun:bun data
USER bun
# Informational only — the real published port is set by compose from .env.
EXPOSE 3000
CMD ["bun", "server.js"]
