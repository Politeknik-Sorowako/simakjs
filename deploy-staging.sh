#!/bin/bash
set -e

# ===========================================
# SIMAK Vokasi - Staging Deployment Script
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.deployment/deploy-staging.config.sh" 2>/dev/null || true

# Setup logging
LOG_FILE="$SCRIPT_DIR/deploy-staging-$(date +%Y%m%d-%H%M%S).log"
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
    fail "Staging deployment failed with exit code $exit_code"
    send_telegram "❌ *Staging Deployment Failed* - $PROJECT_NAME%0A%0A*Error:* Exit code $exit_code%0A*Time:* $(date '+%Y-%m-%d %H:%M:%S')%0A*Log:* $LOG_FILE"
  fi
  duration=$(($(date +%s) - DEPLOY_START))
  log "Deployment duration: ${duration}s"
  log "Log file: $LOG_FILE"
}
trap cleanup EXIT

# Configuration
COMPOSE_FILE="docker-compose.staging.yml"
BRANCH="${1:-development}"

echo ""
echo "============================================="
echo "    SIMAK Vokasi - Staging Deployment"
echo "    Target: $BRANCH"
echo "    Started: $(date)"
echo "============================================="
echo ""

log "Staging deployment started (branch: $BRANCH)"
log "Log file: $LOG_FILE"

# Step 1: Pull latest code
log "Step 1: Pulling latest code..."
git fetch origin "$BRANCH"
git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" origin/"$BRANCH"
git pull origin "$BRANCH"
ok "Code pulled successfully"
log "Current commit: $(git log --oneline -1)"

# Step 2: Check prerequisites
log "Step 2: Checking prerequisites..."
if ! command -v docker &> /dev/null; then
  fail "Docker not found"
  exit 1
fi
ok "Docker available"

if ! docker compose version &> /dev/null; then
  fail "Docker Compose not available"
  exit 1
fi
ok "Docker Compose available"

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
  fail "DATABASE_URL not set in .env"
  exit 1
fi
ok "DATABASE_URL configured"

if [ -z "$JWT_SECRET" ]; then
  fail "JWT_SECRET not set in .env"
  exit 1
fi
ok "JWT_SECRET configured"

# Step 3: Build and deploy
log "Step 3: Building and deploying..."
docker compose -f "$COMPOSE_FILE" build 2>&1 | tee -a "$LOG_FILE" || {
  fail "Docker build failed"
  exit 1
}
ok "Docker images built"

docker compose -f "$COMPOSE_FILE" up -d 2>&1 | tee -a "$LOG_FILE" || {
  fail "Docker compose up failed"
  exit 1
}
ok "Containers started"

# Step 4: Verify deployment
log "Step 4: Verifying deployment..."
MAX_WAIT=60
WAITED=0
HEALTHY=false

while [ $WAITED -lt $MAX_WAIT ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${BACKEND_PORT:-3001}/health --connect-timeout 5 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    ok "Staging backend is healthy (HTTP $HTTP_CODE)"
    HEALTHY=true
    break
  fi
  sleep 3
  WAITED=$((WAITED + 3))
  if [ $((WAITED % 9)) -eq 0 ]; then
    log "  Still waiting... ($WAITED/$MAX_WAIT seconds, HTTP $HTTP_CODE)"
  fi
done

if [ "$HEALTHY" != "true" ]; then
  fail "Staging backend did not become healthy within ${MAX_WAIT}s"
  echo "=== Backend Log ==="
  docker compose -f "$COMPOSE_FILE" logs backend --tail=50 2>/dev/null || docker logs simak_backend_staging --tail 50 2>/dev/null || true
  exit 1
fi

# Step 5: Send notification
log "Step 5: Sending notification..."
commit=$(git log --oneline -1 2>/dev/null || echo "unknown")
duration=$(($(date +%s) - DEPLOY_START))
send_telegram "✅ *Staging Deployment Successful* - $PROJECT_NAME%0A%0A*Branch:* $BRANCH%0A*Commit:* $commit%0A*Duration:* ${duration}s%0A*URL:* https://staging-simak.politekniksorowako.ac.id" || true
ok "Notification sent"

echo ""
echo "============================================="
echo -e "  ${GREEN}✓ Staging Deployment Completed!${NC}"
echo "============================================="
echo ""
log "Access:"
log "  Backend:  http://localhost:${BACKEND_PORT:-3001}"
log "  Frontend: http://localhost:${FRONTEND_PORT:-8081}"
log "  URL:      https://staging-simak.politekniksorowako.ac.id"
echo ""
