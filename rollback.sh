#!/bin/bash
set -e

# ===========================================
# SIMAK Vokasi - Rollback Script
# ===========================================
# Usage:
#   ./rollback.sh                          # Rollback to latest backup
#   ./rollback.sh list                     # List available backups
#   ./rollback.sh backup-20240709-120000   # Rollback to specific backup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.deployment/deploy.config.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

source "$SCRIPT_DIR/scripts/telegram-notify.sh" 2>/dev/null || true

list_backups() {
  echo ""
  echo "Available backups:"
  echo "------------------"
  if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null)" ]; then
    echo "  No backups found in $BACKUP_DIR"
  else
    ls -lh "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | awk '{printf "  %s (%s)\n", $NF, $5}'
  fi
  echo ""
}

restore_backup() {
  local backup_file="$1"
  
  if [ ! -f "$backup_file" ]; then
    fail "Backup file not found: $backup_file"
    exit 1
  fi
  
  local backup_name
  backup_name=$(basename "$backup_file")

  # Verify backup integrity before restore
  log "Verifying backup integrity..."
  if [[ "$backup_file" == *.gz ]]; then
    if ! gunzip -t "$backup_file" 2>/dev/null; then
      fail "Backup file is corrupted: $backup_name"
      exit 1
    fi
  fi
  ok "Backup integrity verified"
  
  log "Restoring from backup: $backup_name"
  
  # Stop backend (keep db running)
  log "Stopping backend..."
  docker compose stop backend 2>/dev/null || true
  
  # Restore database
  log "Restoring database..."
  if gunzip -c "$backup_file" | docker exec -i "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>/dev/null; then
    ok "Database restored successfully"
  else
    fail "Database restore failed"
    exit 1
  fi
  
  # Restart backend
  log "Restarting backend..."
  docker compose start backend 2>/dev/null || docker compose up -d backend
  
  log "Waiting $STARTUP_WAIT_SECONDS seconds..."
  sleep "$STARTUP_WAIT_SECONDS"
  
  # Verify
  bash "$SCRIPT_DIR/health-check.sh" || true
  
  local duration=$(($(date +%s) - ROLLBACK_START))
  ok "Rollback completed in ${duration}s"
  
  send_rollback_notification "$backup_name" "Manual rollback" 2>/dev/null || true
}

ROLLBACK_START=$(date +%s)

echo ""
echo "============================================="
echo "    SIMAK Vokasi - Rollback"
echo "    $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================="
echo ""

# Parse arguments
case "${1:-latest}" in
  list)
    list_backups
    exit 0
    ;;
  latest|--latest)
    # Find latest backup
    if [ ! -d "$BACKUP_DIR" ]; then
      fail "Backup directory not found: $BACKUP_DIR"
      exit 1
    fi
    
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | head -1)
    if [ -z "$LATEST_BACKUP" ]; then
      fail "No backups found in $BACKUP_DIR"
      list_backups
      exit 1
    fi
    
    log "Latest backup: $(basename "$LATEST_BACKUP")"
    echo ""
    echo -n "Restore this backup? [y/N] "
    read -r CONFIRM
    if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
      log "Rollback cancelled"
      exit 0
    fi
    
    restore_backup "$LATEST_BACKUP"
    ;;
  *)
    # Check if it's a backup name
    if [ -f "$BACKUP_DIR/$1.sql.gz" ]; then
      restore_backup "$BACKUP_DIR/$1.sql.gz"
    elif [ -f "$BACKUP_DIR/$1" ]; then
      restore_backup "$BACKUP_DIR/$1"
    elif [ -f "$1" ]; then
      restore_backup "$1"
    else
      fail "Backup not found: $1"
      list_backups
      exit 1
    fi
    ;;
esac
