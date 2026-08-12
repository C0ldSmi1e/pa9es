#!/bin/sh
# Container startup, replacing the old volume-init + migrate services: start
# as root to make the data volume writable by bun (fresh named volumes arrive
# root-owned on some engines), then drop privileges, apply migrations, and
# hand off to the server.
set -e
chown -R bun:bun /app/data
exec su-exec bun sh -c 'bun scripts/migrate.ts && exec bun server.js'
