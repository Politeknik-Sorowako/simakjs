#!/bin/sh
set -e

# Run safe migration, then start the app
bun run --cwd apps/backend db:safe-migrate

# Replace shell with app process (PID 1 for proper signal handling)
exec bun run --cwd apps/backend start
