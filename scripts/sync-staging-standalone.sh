#!/bin/bash
# ===========================================
# SIMAK Vokasi - Staging DB Sync Standalone
# Dapat dijalankan manual atau via cron (02:00 GMT+8)
# Usage:
#   ./scripts/sync-staging-standalone.sh           # eksekusi
#   ./scripts/sync-staging-standalone.sh --dry-run # simulasi
# ===========================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

LOCK_FILE="${LOCK_FILE:-/tmp/simak-sync-staging.lock}"
LOG_DIR="$PROJECT_DIR/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/sync-staging-$(date +%Y%m%d).log"

# Sumber konfigurasi & utilitas notif
source "$PROJECT_DIR/.deployment/sync-staging.config.sh"
source "$SCRIPT_DIR/telegram-notify.sh" 2>/dev/null || true

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"; }

# Pastikan DATABASE_URL untuk DB staging tersedia (dari .env / config)
if [ -z "$DATABASE_URL" ]; then
  log "ERROR: DATABASE_URL belum diset di .env"
  exit 1
fi

# Anti-tabrakan: pastikan tidak ada sync lain yang berjalan
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "WARN: Proses sync lain sedang berjalan, dilewati."
  exit 0
fi

log "Staging DB sync dimulai (mode: ${LOCAL_SYNC:-true}, arg: $*)"

cd "$PROJECT_DIR/apps/backend"
if bun run db:sync-staging "$@"; then
  log "Staging DB sync selesai dengan sukses."
  if [ "$SYNC_TELEGRAM_ENABLED" = "true" ]; then
    send_telegram "✅ *Staging DB Sync OK* - $(date '+%Y-%m-%d %H:%M:%S')" || true
  fi
else
  STATUS=$?
  log "Staging DB sync GAGAL (exit $STATUS)."
  if [ "$SYNC_TELEGRAM_ENABLED" = "true" ]; then
    send_telegram "❌ *Staging DB Sync GAGAL* - $(date '+%Y-%m-%d %H:%M:%S') (exit $STATUS)" || true
  fi
  exit "$STATUS"
fi