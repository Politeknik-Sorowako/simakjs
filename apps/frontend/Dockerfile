# Build stage
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY apps/frontend/package.json ./
RUN bun install
COPY apps/frontend ./
RUN bun run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
