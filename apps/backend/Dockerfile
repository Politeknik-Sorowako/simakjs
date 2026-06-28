FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/backend/package.json ./apps/backend/
RUN bun install --production --filter backend
COPY apps/backend ./apps/backend
EXPOSE 3000
CMD ["sh", "-c", "bun run --cwd apps/backend db:push && bun run --cwd apps/backend dev"]


