FROM oven/bun:1-alpine

# Install PostgreSQL client for backup/restore
RUN apk add --no-cache postgresql-client

WORKDIR /app
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
RUN bun install --filter backend
COPY apps/backend ./apps/backend

# Create backups directory
RUN mkdir -p ./apps/backend/backups

EXPOSE 3000

# Use safe-migrate instead of db:push (safe: auto-backup before migration)
CMD ["sh", "-c", "bun run --cwd apps/backend db:safe-migrate && bun run --cwd apps/backend start"]


