#!/bin/bash
set -e

# ===========================================
# SIMAK Vokasi - Main Deployment Script (CI/CD)
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.deployment/deploy.config.sh"

# Setup logging
LOG_FILE="$SCRIPT_DIR/deploy-$(date +%Y%m%d-%H%M%S).log"
DEPLOY_START=$(date +%s)

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() {
  echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}
ok()   { echo -e "  ${GREEN}✓${NC} $1"; echo "  [OK] $1" >> "$LOG_FILE"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; echo "  [WARN] $1" >> "$LOG_FILE"; }
fail() { echo -e "  ${RED}✗${NC} $1"; echo "  [FAIL] $1" >> "$LOG_FILE"; }

# Source utility scripts
source "$SCRIPT_DIR/scripts/telegram-notify.sh" 2>/dev/null || true

cleanup() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    fail "Deployment failed with exit code $exit_code"
    send_telegram "❌ *Deployment Failed* - $PROJECT_NAME%0A%0A*Error:* Exit code $exit_code%0A*Time:* $(date '+%Y-%m-%d %H:%M:%S')%0A*Log:* $LOG_FILE"
    
    if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
      warn "Initiating rollback..."
      "$SCRIPT_DIR/rollback.sh"
    fi
  fi
  duration=$(($(date +%s) - DEPLOY_START))
  log "Deployment duration: ${duration}s"
  log "Log file: $LOG_FILE"
}
trap cleanup EXIT

pull_latest_code() {
  log "Step 0: Pulling latest code..."
  git pull origin main || {
    fail "Failed to pull latest code"
    return 1
  }
  ok "Code pulled successfully"
  log "Current commit: $(git log --oneline -1)"
}

check_prerequisites() {
  log "Step 1: Checking prerequisites..."
  
  if ! command -v docker &> /dev/null; then
    fail "Docker not found"
    exit 1
  fi
  ok "Docker available"
  
  if ! docker info &> /dev/null; then
    fail "Docker daemon not running"
    exit 1
  fi
  ok "Docker daemon running"
  
  if ! docker compose version &> /dev/null; then
    fail "Docker Compose not available"
    exit 1
  fi
  ok "Docker Compose available"
  
  # Check disk space
  DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
  if [ "$DISK_USAGE" -gt 90 ]; then
    fail "Disk space critical: $DISK_USAGE%"
    exit 1
  fi
  ok "Disk space: $DISK_USAGE%"

  # Check required database credentials
  if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    fail "POSTGRES_USER and POSTGRES_PASSWORD must be set in .env"
    exit 1
  fi
}

run_pre_tests() {
  if [ "$RUN_PRE_TESTS" != "true" ]; then
    log "Step 2: Skipping pre-deployment tests (disabled)"
    return
  fi
  log "Step 2: Running pre-deployment tests..."
  if bash "$SCRIPT_DIR/scripts/pre-deploy-test.sh"; then
    ok "Pre-deployment tests passed"
  else
    fail "Pre-deployment tests failed"
    exit 1
  fi
}

backup_database() {
  log "Step 3: Backing up database..."
  mkdir -p "$BACKUP_DIR"
  
  BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
  BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
  
  docker exec "$DB_CONTAINER" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_PATH" 2>/dev/null || {
    warn "Database backup failed (container may not be running)"
    return
  }
  
  if [ "$BACKUP_COMPRESS" = "true" ]; then
    gzip "$BACKUP_PATH"
    BACKUP_PATH="${BACKUP_PATH}.gz"

    # Verify backup integrity
    if ! gunzip -t "$BACKUP_PATH" 2>/dev/null; then
      fail "Backup integrity check failed: $(basename "$BACKUP_PATH")"
      rm -f "$BACKUP_PATH"
      exit 1
    fi
    ok "Backup integrity verified"
  fi
  
  BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
  ok "Backup created: $(basename "$BACKUP_PATH") ($BACKUP_SIZE)"
  
  # Clean old backups
  cd "$BACKUP_DIR"
  ls -t backup-*.sql.gz 2>/dev/null | tail -n +$((BACKUP_RETENTION + 1)) | xargs -r rm -f
  ok "Keeping last $BACKUP_RETENTION backups"
}

cleanup_containers() {
  log "Step 4: Cleaning up containers and Docker images..."
  
  if [ "$FORCE_CLEANUP" != "true" ]; then
    log "Force cleanup disabled, using normal shutdown"
    docker compose down --timeout 30
    ok "Containers stopped"
    return
  fi
  
  # Strategy 1: Normal shutdown
  log "  Strategy 1: docker compose down..."
  docker compose down --timeout 30 2>/dev/null || true
  
  # Strategy 2: Force remove by name
  log "  Strategy 2: Force remove containers..."
  for container in "$BACKEND_CONTAINER" "$FRONTEND_CONTAINER"; do
    docker rm -f "$container" 2>/dev/null || true
  done
  
  # Strategy 3: Remove by compose project
  log "  Strategy 3: Remove compose containers..."
  docker ps -a --filter "label=com.docker.compose.project=$PROJECT_NAME" -q | xargs -r docker rm -f 2>/dev/null || true
  
  # Strategy 4: Prune stopped containers
  docker container prune -f 2>/dev/null || true

  # Strategy 5: Clean old Docker images (keep last 72h)
  log "  Strategy 5: Clean old Docker images..."
  docker image prune -f --filter "until=72h" 2>/dev/null || true
  docker volume prune -f 2>/dev/null || true
  ok "Docker images cleaned"
  
  sleep 3
  ok "Containers cleaned up"
}

build_and_deploy() {
  log "Step 5: Building and deploying..."
  
  docker compose build 2>&1 | tee -a "$LOG_FILE" || {
    fail "Docker build failed"
    exit 1
  }
  ok "Docker images built"
  
  docker compose up -d 2>&1 | tee -a "$LOG_FILE" || {
    fail "Docker compose up failed"
    exit 1
  }
  ok "Containers started"
}

verify_deployment() {
  log "Step 6: Verifying deployment..."

  # Dynamic wait for database migration
  log "  Waiting for database migration to complete..."
  MAX_WAIT=60
  WAITED=0
  MIGRATION_OK=false
  while [ $WAITED -lt $MAX_WAIT ]; do
    if docker exec "$BACKEND_CONTAINER" curl -s http://localhost:$BACKEND_PORT/health --connect-timeout 5 2>/dev/null | grep -q '"status":"ok"'; then
      ok "Database migration completed and API is healthy"
      MIGRATION_OK=true
      break
    fi
    sleep 3
    WAITED=$((WAITED + 3))
    if [ $((WAITED % 9)) -eq 0 ]; then
      log "    Still waiting... ($WAITED/$MAX_WAIT seconds)"
    fi
  done

  if [ "$MIGRATION_OK" != "true" ]; then
    fail "Service did not become healthy within ${MAX_WAIT}s"

    echo "=== Backend Log ==="
    docker compose logs "$BACKEND_CONTAINER" --tail="$BACKEND_LOG_LINES"

    if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
      return 1
    fi
    exit 1
  fi

  # Health check with retry
  for i in $(seq 1 "$HEALTH_CHECK_RETRIES"); do
    HTTP_CODE=$(docker exec "$BACKEND_CONTAINER" curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/health --connect-timeout "$HEALTH_CHECK_TIMEOUT" 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
      ok "Health check passed (HTTP $HTTP_CODE)"
      docker exec "$BACKEND_CONTAINER" curl -s http://localhost:$BACKEND_PORT/health --connect-timeout 5 2>/dev/null | head -c 200
      echo ""
      break
    fi
    if [ "$i" -lt "$HEALTH_CHECK_RETRIES" ]; then
      warn "Health check attempt $i/$HEALTH_CHECK_RETRIES (HTTP $HTTP_CODE), waiting..."
      sleep "$HEALTH_CHECK_INTERVAL"
    else
      fail "Health check failed after $HEALTH_CHECK_RETRIES attempts"

      echo "=== Backend Log ==="
      docker compose logs "$BACKEND_CONTAINER" --tail="$BACKEND_LOG_LINES"

      if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
        return 1
      fi
      exit 1
    fi
  done

  # Run full health check
  bash "$SCRIPT_DIR/health-check.sh" || true
}

run_post_tests() {
  if [ "$RUN_POST_TESTS" != "true" ]; then
    log "Step 7: Skipping post-deployment tests (disabled)"
    return
  fi
  log "Step 7: Running post-deployment tests..."
  bash "$SCRIPT_DIR/scripts/post-deploy-test.sh" || {
    warn "Some post-deployment tests failed"
  }
}

send_notification() {
  log "Step 8: Sending notification..."
  local branch="${1:-main}"
  local commit
  commit=$(git log --oneline -1 2>/dev/null || echo "unknown")
  local duration=$(($(date +%s) - DEPLOY_START))
  
  send_deploy_success "$branch" "$commit" "$duration" || true
  ok "Notification sent"
}

# Main deployment flow
main() {
  local branch="${1:-main}"
  
  echo ""
  echo "============================================="
  echo "    SIMAK Vokasi - Deployment"
  echo "    Target: $branch"
  echo "    Started: $(date)"
  echo "============================================="
  echo ""
  
  log "Deployment started (branch: $branch)"
  log "Log file: $LOG_FILE"
  echo ""
  
  pull_latest_code
  check_prerequisites
  run_pre_tests
  backup_database
  cleanup_containers
  build_and_deploy
  verify_deployment
  run_post_tests
  send_notification "$branch"
  
  echo ""
  echo "============================================="
  echo -e "  ${GREEN}✓ Deployment completed successfully!${NC}"
  echo "============================================="
  echo ""
}

main "$@"
