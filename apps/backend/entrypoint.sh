#!/bin/sh
set -e

# Run safe migration, then start the app
# DISABLE_PUSH_FALLBACK=true prevents drizzle-kit push (destructive schema sync)
# from running automatically — only incremental drizzle-kit migrate is used.
# If migration fails, the app still starts with a warning so existing data is never lost.
# To force a schema push, run manually:
#   docker exec simak_backend bun run --cwd apps/backend db:safe-migrate
DISABLE_PUSH_FALLBACK=true bun run --cwd apps/backend db:safe-migrate

# Replace shell with app process (PID 1 for proper signal handling)
exec bun run --cwd apps/backend start
