#!/usr/bin/env bash
# Server-side deploy, invoked over SSH by .github/workflows/deploy.yml (and
# runnable by hand on the server). Assumes: the repo is cloned at APP_DIR, a
# production .env sits next to docker-compose.yml there, and this user can
# run docker.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/apps/pa9es}"
cd "$APP_DIR"

# The server clone is a deploy target, not a workspace — force it to match
# origin/main exactly. Untracked files (.env) are untouched; never add
# `git clean` here, it would eat them.
git fetch origin main
git reset --hard origin/main

# Build first so the running app stays up through the slow part; `up` then
# re-runs the one-shot migrate service (idempotent) before swapping the app.
docker compose build --pull
docker compose up -d

# Each deploy strands the previous images; drop the dangling ones.
docker image prune -f

# Smoke check on the published port. Any status < 400 passes — a plain
# 127.0.0.1 request gets the 307 canonical-host redirect, which curl -f
# accepts.
HOST_PORT="$(grep -E '^HOST_PORT=' .env | cut -d= -f2- || true)"
curl -fsS --retry 10 --retry-connrefused --retry-delay 2 -o /dev/null \
  "http://127.0.0.1:${HOST_PORT:-3000}/"

echo "deploy OK: $(git rev-parse --short HEAD)"
