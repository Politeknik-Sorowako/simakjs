# Build stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
COPY apps/frontend/package.json ./apps/frontend/
RUN bun install --ci
COPY apps/frontend ./apps/frontend
WORKDIR /app/apps/frontend
RUN bun run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
