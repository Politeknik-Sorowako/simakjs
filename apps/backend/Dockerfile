FROM oven/bun:1-alpine

# Install PostgreSQL client for backup/restore
RUN apk add --no-cache postgresql-client git

WORKDIR /app
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
RUN bun install --filter backend
# Copy .git so version.service can resolve the commit hash in the container
COPY .git ./.git
COPY apps/backend ./apps/backend

# Create backups directory
RUN mkdir -p ./apps/backend/backups

COPY apps/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]


