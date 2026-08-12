#!/usr/bin/env bash
# Server-side deploy, invoked over SSH by .github/workflows/deploy.yml (and
# runnable by hand on the server). Assumes: the repo is cloned at APP_DIR, a
# production .env sits next to docker-compose.yml there, and this user can
# run docker.
set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/pa9es}"
cd "$APP_DIR"

# The server clone is a deploy target, not a workspace — force it to match
# origin/main exactly. Untracked files (.env) are untouched; never add
# `git clean` here, it would eat them.
git fetch origin main
git reset --hard origin/main

# Build first so the running app stays up through the slow part; the
# container applies migrations at startup, before the server listens.
docker compose build --pull
docker compose up -d --remove-orphans

# Each deploy strands the previous images; drop the dangling ones.
docker image prune -f

# Smoke check on the published port. --retry-all-errors matters: while the
# app boots, docker's port proxy RESETS connections rather than refusing
# them, and plain --retry treats a reset as fatal. Any status < 400 passes —
# a plain 127.0.0.1 request gets the 307 canonical-host redirect, which
# curl -f accepts.
HOST_PORT="$(grep -E '^HOST_PORT=' .env | cut -d= -f2- || true)"
curl -fsS --retry 15 --retry-all-errors --retry-delay 2 -o /dev/null \
  "http://127.0.0.1:${HOST_PORT:-3000}/"

echo "deploy OK: $(git rev-parse --short HEAD)"
