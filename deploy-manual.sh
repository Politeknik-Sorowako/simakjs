#!/bin/bash
set -e

# ===========================================
# SIMAK Vokasi - Manual Deployment Script
# ===========================================
# Usage:
#   ./deploy-manual.sh                  # Deploy main branch
#   ./deploy-manual.sh develop          # Deploy specific branch
#   ./deploy-manual.sh --skip-tests     # Deploy without tests
#   ./deploy-manual.sh --skip-backup    # Deploy without backup
#   ./deploy-manual.sh --rollback       # Rollback to previous version
#   ./deploy-manual.sh --health         # Run health check only
#   ./deploy-manual.sh --dashboard      # Show monitoring dashboard

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.deployment/deploy.config.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

show_help() {
  echo ""
  echo "SIMAK Vokasi - Manual Deployment Script"
  echo ""
  echo "Usage:"
  echo "  ./deploy-manual.sh [branch] [options]"
  echo ""
  echo "Options:"
  echo "  --skip-tests     Skip pre and post deployment tests"
  echo "  --skip-backup    Skip database backup"
  echo "  --skip-pull      Skip git pull"
  echo "  --no-force       Don't force remove containers"
  echo "  --rollback       Rollback to previous backup"
  echo "  --health         Run health check only"
  echo "  --dashboard      Show monitoring dashboard"
  echo "  --status         Show deployment status"
  echo "  --help           Show this help"
  echo ""
  echo "Examples:"
  echo "  ./deploy-manual.sh                       # Deploy main branch"
  echo "  ./deploy-manual.sh develop               # Deploy develop branch"
  echo "  ./deploy-manual.sh --skip-tests          # Quick deploy"
  echo "  ./deploy-manual.sh --rollback            # Rollback"
  echo "  ./deploy-manual.sh --health              # Health check"
  echo ""
}

source "$SCRIPT_DIR/telegram-notify.sh" 2>/dev/null || true

# Parse arguments
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'main')"
SKIP_TESTS=false
SKIP_BACKUP=false
SKIP_PULL=false
FORCE_CLEANUP=true

while [ $# -gt 0 ]; do
  case "$1" in
    --skip-tests) SKIP_TESTS=true; shift ;;
    --skip-backup) SKIP_BACKUP=true; shift ;;
    --skip-pull) SKIP_PULL=true; shift ;;
    --no-force) FORCE_CLEANUP=false; shift ;;
    --rollback) bash "$SCRIPT_DIR/rollback.sh"; exit $? ;;
    --health) bash "$SCRIPT_DIR/scripts/health-check.sh"; exit $? ;;
    --dashboard) bash "$SCRIPT_DIR/dashboard.sh"; exit $? ;;
    --status) bash "$SCRIPT_DIR/scripts/health-check.sh; docker compose ps; exit $?"; exit $? ;;
    --help) show_help; exit 0 ;;
    --*) echo "Unknown option: $1"; show_help; exit 1 ;;
    *) BRANCH="$1"; shift ;;
  esac
done

echo ""
echo "============================================="
echo "    ${BOLD}SIMAK Vokasi - Manual Deployment${NC}"
echo "    Branch: $BRANCH"
echo "    Started: $(date)"
echo "============================================="
echo ""

DEPLOY_START=$(date +%s)

# Step 1: Pull code
if [ "$SKIP_PULL" = "false" ]; then
  log "Step 1/7: Pulling latest code..."
  git fetch origin "$BRANCH"
  git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" origin/"$BRANCH"
  git pull origin "$BRANCH"
  ok "Branch '$BRANCH' checked out and up to date"
  log "Commit: $(git log --oneline -1)"
else
  log "Step 1/7: Skipping git pull"
fi

# Step 2: Prerequisites check
log "Step 2/7: Checking prerequisites..."
for cmd in docker docker-compose curl; do
  if command -v "$cmd" &> /dev/null; then
    ok "$cmd available"
  else
    fail "$cmd not found"
    exit 1
  fi
done

# Check required database credentials (needed for backup)
if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
  warn "POSTGRES_USER and POSTGRES_PASSWORD not set in .env"
  warn "Database backup will be skipped"
fi

# Step 3: Backup
if [ "$SKIP_BACKUP" = "false" ]; then
  log "Step 3/7: Backing up database..."
  mkdir -p "$BACKUP_DIR"
  
  if docker ps --filter "name=$DB_CONTAINER" --format "{{.Names}}" | grep -q "$DB_CONTAINER"; then
    BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
    
    docker exec "$DB_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_PATH" 2>/dev/null && {
      gzip "$BACKUP_PATH"
      BACKUP_SIZE=$(du -h "${BACKUP_PATH}.gz" | cut -f1)
      ok "Backup created: ${BACKUP_FILE}.gz ($BACKUP_SIZE)"
      
      # Clean old backups
      ls -t "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | tail -n +$((BACKUP_RETENTION + 1)) | xargs -r rm -f
    } || {
      warn "Database backup failed (container may be restarting)"
    }
  else
    warn "Database container not running, skipping backup"
  fi
else
  log "Step 3/7: Skipping backup"
fi

# Step 4: Container cleanup
log "Step 4/7: Cleaning up containers..."
if [ "$FORCE_CLEANUP" = "true" ]; then
  docker compose down --timeout 15 2>/dev/null || true
  for container in "$BACKEND_CONTAINER" "$FRONTEND_CONTAINER"; do
    docker rm -f "$container" 2>/dev/null || true
  done
  docker container prune -f 2>/dev/null || true
  sleep 3
  ok "Containers cleaned up (force mode)"
else
  docker compose down
  ok "Containers stopped normally"
fi

# Step 5: Build and deploy
log "Step 5/7: Building and deploying..."
docker compose build 2>&1 | tail -5
docker compose up -d
ok "Containers started"

# Step 6: Verify deployment
log "Step 6/7: Verifying deployment..."
log "  Waiting $STARTUP_WAIT_SECONDS seconds..."
sleep "$STARTUP_WAIT_SECONDS"

echo ""
bash "$SCRIPT_DIR/scripts/health-check.sh" || true

# Step 7: Post-deployment tests
if [ "$SKIP_TESTS" = "false" ] && [ "$RUN_POST_TESTS" = "true" ]; then
  log "Step 7/7: Running post-deployment tests..."
  bash "$SCRIPT_DIR/scripts/post-deploy-test.sh" || true
else
  log "Step 7/7: Skipping post-deployment tests"
fi

# Duration
DURATION=$(($(date +%s) - DEPLOY_START))
echo ""
echo "============================================="
echo -e "  ${GREEN}✓ Deployment completed in ${DURATION}s${NC}"
echo "============================================="
echo ""
log "Access:"
log "  Backend:  http://localhost:$BACKEND_PORT"
log "  Frontend: http://localhost:$FRONTEND_PORT"
log "  Swagger:  http://localhost:$BACKEND_PORT/swagger"
echo ""

# Send notification
source "$SCRIPT_DIR/telegram-notify.sh" 2>/dev/null
send_deploy_success "$BRANCH" "$(git log --oneline -1)" "$DURATION" 2>/dev/null || true
