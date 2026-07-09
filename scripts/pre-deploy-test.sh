#!/bin/bash

# ===========================================
# SIMAK Vokasi - Pre-Deployment Tests
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.deployment/deploy.config.sh" 2>/dev/null || true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
ok() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }

EXIT_CODE=0

echo ""
echo "============================================="
echo "    SIMAK Vokasi - Pre-Deployment Tests"
echo "    $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================="
echo ""

# 1. Git status check
log "Check 1: Git status..."
cd "$SCRIPT_DIR/.."
if [ -z "$(git status --porcelain)" ]; then
  ok "Working directory is clean"
else
  warn "Working directory has uncommitted changes"
  git status --short
fi

# 2. Environment file check
log "Check 2: Environment file..."
if [ -f .env ]; then
  ok ".env file exists"
else
  fail ".env file is missing! Please create from .env.example"
  EXIT_CODE=1
fi

# 3. Docker check
log "Check 3: Docker availability..."
if command -v docker &> /dev/null; then
  ok "Docker is installed"
  
  if docker info &> /dev/null; then
    ok "Docker daemon is running"
  else
    fail "Docker daemon is not running"
    EXIT_CODE=1
  fi
else
  fail "Docker is not installed"
  EXIT_CODE=1
fi

# 4. Docker Compose check
log "Check 4: Docker Compose availability..."
if docker compose version &> /dev/null; then
  ok "Docker Compose is available"
else
  fail "Docker Compose is not available"
  EXIT_CODE=1
fi

# 5. Disk space check
log "Check 5: Disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
  ok "Disk space: $DISK_USAGE%"
elif [ "$DISK_USAGE" -lt 90 ]; then
  warn "Disk space: $DISK_USAGE% (above 80%)"
else
  fail "Disk space: $DISK_USAGE% (above 90%)"
  EXIT_CODE=1
fi

# 6. Memory check
log "Check 6: Memory..."
MEM_TOTAL=$(free -m | awk 'NR==2 {print $2}')
MEM_USED=$(free -m | awk 'NR==2 {print $3}')
MEM_PCT=$((MEM_USED * 100 / MEM_TOTAL))
if [ "$MEM_PCT" -lt 80 ]; then
  ok "Memory: ${MEM_PCT}% used (${MEM_USED}MB / ${MEM_TOTAL}MB)"
elif [ "$MEM_PCT" -lt 90 ]; then
  warn "Memory: ${MEM_PCT}% used (${MEM_USED}MB / ${MEM_TOTAL}MB)"
else
  fail "Memory: ${MEM_PCT}% used (${MEM_USED}MB / ${MEM_TOTAL}MB)"
  EXIT_CODE=1
fi

# 7. Port availability check
log "Check 7: Required ports..."
for port in $BACKEND_PORT $FRONTEND_PORT $DB_PORT; do
  if ss -tlnp | grep -q ":$port "; then
    warn "Port $port is already in use"
  else
    ok "Port $port is available"
  fi
done

# 8. Docker Compose file check
log "Check 8: Docker Compose file..."
if [ -f "$DOCKER_COMPOSE_FILE" ]; then
  ok "docker-compose.yml exists"
else
  fail "docker-compose.yml not found at $DOCKER_COMPOSE_FILE"
  EXIT_CODE=1
fi

# 9. Dockerfile check
log "Check 9: Dockerfiles..."
if [ -f "$PROJECT_DIR/apps/backend/Dockerfile" ]; then
  ok "Backend Dockerfile exists"
else
  fail "Backend Dockerfile not found"
  EXIT_CODE=1
fi

if [ -f "$PROJECT_DIR/apps/frontend/Dockerfile" ]; then
  ok "Frontend Dockerfile exists"
else
  fail "Frontend Dockerfile not found"
  EXIT_CODE=1
fi

echo ""
echo "============================================="
if [ "$EXIT_CODE" -eq 0 ]; then
  echo -e "  ${GREEN}✓ All pre-deployment tests passed!${NC}"
else
  echo -e "  ${RED}✗ Some pre-deployment tests failed${NC}"
fi
echo "============================================="
echo ""

exit $EXIT_CODE
