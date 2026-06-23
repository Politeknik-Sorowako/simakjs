FROM oven/bun:1-alpine
WORKDIR /app
COPY package.json bun.lockb ./
COPY apps/backend/package.json ./apps/backend/
RUN bun install --ci
COPY apps/backend ./apps/backend
EXPOSE 3000
CMD ["bun", "run", "--cwd", "apps/backend", "dev"]
