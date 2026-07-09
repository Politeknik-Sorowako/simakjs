#!/bin/bash

# ===========================================
# SIMAK Vokasi - Deployment Configuration
# ===========================================

# Project settings
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT_NAME="simakjs"

# Backup settings
BACKUP_RETENTION=5
BACKUP_COMPRESS=true
BACKUP_DIR="$PROJECT_DIR/apps/backend/backups"

# Docker settings
DOCKER_COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
DOCKER_NETWORK="simakjs_default"

# Container names
BACKEND_CONTAINER="simak_backend"
FRONTEND_CONTAINER="simak_frontend"
DB_CONTAINER="simak_db"

# Service ports
BACKEND_PORT=3000
FRONTEND_PORT=80
DB_PORT=5433

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

# Database settings (from .env or defaults)
POSTGRES_USER="${POSTGRES_USER:-simak_user}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-simak_password}"
POSTGRES_DB="${POSTGRES_DB:-simak_vokasi}"

# Deployment settings
MAX_DEPLOY_RETRIES=3
DEPLOY_TIMEOUT=300
ROLLBACK_ON_FAILURE=true
FORCE_CLEANUP=true
