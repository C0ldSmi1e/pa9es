# syntax=docker/dockerfile:1

FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
# postinstall needs scripts/, absent here; the builder reruns copy-monaco
RUN bun install --frozen-lockfile --ignore-scripts

FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun scripts/copy-monaco.ts
# build-time placeholders only; real values come from compose env_file
ENV NODE_ENV=production \
    BETTER_AUTH_SECRET="insecure-build-time-placeholder-32-chars-min" \
    BETTER_AUTH_URL="http://localhost:3000"
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
RUN apk add --no-cache su-exec
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=bun:bun /app/.next/standalone ./
COPY --from=builder --chown=bun:bun /app/.next/static ./.next/static
COPY --from=builder --chown=bun:bun /app/public ./public
# loaded via createRequire at runtime, invisible to Next's file tracing
COPY --from=deps --chown=bun:bun /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --chown=bun:bun drizzle ./drizzle
COPY --chown=bun:bun scripts/migrate.ts ./scripts/migrate.ts
COPY docker-entrypoint.sh ./
RUN mkdir -p data
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]
