#!/bin/sh
set -e

# Run safe migration, then start the app
# The script auto-detects whether the database is empty or has existing tables:
#   - Empty database → drizzle-kit push (create schema from scratch)
#   - Existing database → drizzle-kit migrate (incremental update, no data loss risk)
# If migration fails on an existing database, the container will NOT start.
bun run --cwd apps/backend db:safe-migrate

# Replace shell with app process (PID 1 for proper signal handling)
# Use --smol in production and staging to optimize heap GC and avoid file-watcher overhead
if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "staging" ]; then
  exec bun --smol --cwd apps/backend src/index.ts
else
  exec bun run --cwd apps/backend start:dev
fi
