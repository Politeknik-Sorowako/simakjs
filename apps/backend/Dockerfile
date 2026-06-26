FROM oven/bun:1-alpine
WORKDIR /app
COPY apps/backend/package.json ./
RUN bun install --production
COPY apps/backend ./
EXPOSE 3000
CMD ["bun", "run", "dev"]
