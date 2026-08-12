#!/bin/sh
set -e
chown -R bun:bun /app/data
exec su-exec bun sh -c 'bun scripts/migrate.ts && exec bun server.js'
