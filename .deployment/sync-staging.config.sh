#!/bin/bash

# ===========================================
# SIMAK Vokasi - Staging DB Sync Configuration
# Dipakai oleh scripts/sync-staging-standalone.sh
# ===========================================

SYNC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load .env file (secret) jika tersedia
if [ -f "$SYNC_DIR/.env" ]; then
  set -a
  source "$SYNC_DIR/.env"
  set +a
fi

# --- Mode sinkronisasi ---
# Staging & Production berada di VPS yang sama, jadi default = LOCAL (docker exec langsung)
# Set LOCAL_SYNC=false untuk fallback via SSH (menuju PROD_SSH_HOST).
LOCAL_SYNC="${LOCAL_SYNC:-true}"

# --- Container production (sumber data, pada VPS yang sama) ---
PROD_DB_NAME="${PROD_DB_NAME:-simak_vokasi}"
PROD_DB_USER="${PROD_DB_USER:-simak_user}"
PROD_DB_CONTAINER="${PROD_DB_CONTAINER:-simak_db}"

# --- Container staging (target restore) ---
STAGING_DB_CONTAINER="${STAGING_DB_CONTAINER:-simak_db_staging}"

# --- Fallback SSH (hanya dipakai bila LOCAL_SYNC=false) ---
PROD_SSH_HOST="${PROD_SSH_HOST:-localhost}"
PROD_SSH_USER="${PROD_SSH_USER:-nasrulhamid}"
PROD_SSH_PORT="${PROD_SSH_PORT:-2200}"
PROD_SSH_KEY="${PROD_SSH_KEY:-/home/nasrulhamid/.ssh/id_deploy}"

# --- URL health check backend staging ---
STAGING_BACKEND_URL="${STAGING_BACKEND_URL:-http://localhost:${BACKEND_PORT:-3001}}"

# --- Telegram notification ---
SYNC_TELEGRAM_ENABLED="${SYNC_TELEGRAM_ENABLED:-true}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# --- Cron otomatis (02:00 GMT+8 = Asia/Makassar) ---
SYNC_STAGING_ENABLED="${SYNC_STAGING_ENABLED:-true}"
SYNC_STAGING_CRON="${SYNC_STAGING_CRON:-0 2 * * *}"
SYNC_STAGING_TZ="${SYNC_STAGING_TZ:-Asia/Makassar}"