#!/bin/bash

# ===========================================
# SIMAK Vokasi - Deployment Configuration
# ===========================================

# Project settings
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="simakjs"

# Load .env file if available
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# Backup settings
BACKUP_RETENTION=5
BACKUP_COMPRESS=true
BACKUP_DIR="$PROJECT_DIR/apps/backend/backups"

# Environment detection (auto or via APP_ENV override)
# Both environments run on the same VPS but in different directories:
#   /var/www/simakjs            -> production
#   /var/www/simakjs-staging    -> staging
if [ -z "${DEPLOY_ENV:-}" ]; then
  case "$PROJECT_DIR" in
    *-staging* | *staging*) DEPLOY_ENV="staging" ;;
    *) DEPLOY_ENV="production" ;;
  esac
fi

# Docker settings
if [ "$DEPLOY_ENV" = "staging" ]; then
  DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.staging.yml"
  DOCKER_NETWORK="simakjs-staging_default"
  BACKEND_CONTAINER="simak_backend_staging"
  FRONTEND_CONTAINER="simak_frontend_staging"
  DB_CONTAINER="simak_db_staging"
  BACKEND_PORT="${BACKEND_PORT:-3001}"
  FRONTEND_PORT="${FRONTEND_PORT:-8081}"
  DB_PORT="${DB_PORT:-5434}"
else
  DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
  DOCKER_NETWORK="simakjs_default"
  BACKEND_CONTAINER="simak_backend"
  FRONTEND_CONTAINER="simak_frontend"
  DB_CONTAINER="simak_db"
  BACKEND_PORT="${BACKEND_PORT:-3000}"
  FRONTEND_PORT="${FRONTEND_PORT:-80}"
  DB_PORT="${DB_PORT:-5433}"
fi

# Health check settings
HEALTH_URL="http://localhost:$BACKEND_PORT/health"
FRONTEND_URL="http://localhost:$FRONTEND_PORT"
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_INTERVAL=5
HEALTH_CHECK_TIMEOUT=10
STARTUP_WAIT_SECONDS=8

# Backend log settings
BACKEND_LOG_LINES=30

# Telegram notification settings
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"
TELEGRAM_ENABLED="${TELEGRAM_ENABLED:-false}"

# Testing settings
RUN_PRE_TESTS="${RUN_PRE_TESTS:-false}"
RUN_POST_TESTS="${RUN_POST_TESTS:-true}"

# Auto-scaling settings (experimental)
AUTO_SCALING_ENABLED=false
MIN_REPLICAS=1
MAX_REPLICAS=3
SCALE_UP_CPU_THRESHOLD=70
SCALE_UP_MEM_THRESHOLD=80
SCALE_DOWN_CPU_THRESHOLD=30
SCALE_DOWN_MEM_THRESHOLD=40
SCALE_UP_COOLDOWN=300
SCALE_DOWN_COOLDOWN=600

# Database settings (from .env)
POSTGRES_USER="${POSTGRES_USER:-}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-}"
POSTGRES_DB="${POSTGRES_DB:-simak_vokasi}"

# Deployment settings
MAX_DEPLOY_RETRIES=3
DEPLOY_TIMEOUT=300
ROLLBACK_ON_FAILURE=true
FORCE_CLEANUP=true
