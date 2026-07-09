#!/bin/bash

# ===========================================
# SIMAK Vokasi - Post-Deployment Tests
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.deployment/deploy.config.sh" 2>/dev/null || true
source "$SCRIPT_DIR/../health-check.sh" 2>/dev/null || true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
ok() { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

EXIT_CODE=0

echo ""
echo "============================================="
echo "    SIMAK Vokasi - Post-Deployment Tests"
echo "    $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================="
echo ""

# 1. Container status check
log "Test 1: Container status..."
for container in "$BACKEND_CONTAINER" "$DB_CONTAINER" "$FRONTEND_CONTAINER"; do
  if docker ps --filter "name=$container" --format "{{.Names}}" 2>/dev/null | grep -q "$container"; then
    STATUS=$(docker ps --filter "name=$container" --format "{{.Status}}")
    ok "$container is running ($STATUS)"
  else
    fail "$container is NOT running"
    EXIT_CODE=1
  fi
done

# 2. Health endpoint check
log "Test 2: API health endpoint..."
for i in $(seq 1 "$HEALTH_CHECK_RETRIES"); do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --connect-timeout "$HEALTH_CHECK_TIMEOUT" 2>/dev/null)
  if [ "$HTTP_CODE" = "200" ]; then
    ok "API health endpoint returned HTTP 200"
    HEALTH_RESPONSE=$(curl -s "$HEALTH_URL")
    echo "     Response: $HEALTH_RESPONSE"
    break
  fi
  if [ "$i" -lt "$HEALTH_CHECK_RETRIES" ]; then
    warn "Health check attempt $i/$HEALTH_CHECK_RETRIES (HTTP $HTTP_CODE), retrying..."
    sleep "$HEALTH_CHECK_INTERVAL"
  else
    fail "API health endpoint returned HTTP $HTTP_CODE after $HEALTH_CHECK_RETRIES attempts"
    EXIT_CODE=1
  fi
done

# 3. Database connection test
log "Test 3: Database connection..."
DB_TEST=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" 2>/dev/null)
if echo "$DB_TEST" | grep -q "1"; then
  ok "Database connection successful"
else
  fail "Database connection failed"
  EXIT_CODE=1
fi

# 4. Migration test
log "Test 4: Migration status..."
USERS_EXIST=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='users');" 2>/dev/null | tr -d ' ')
if [ "$USERS_EXIST" = "t" ]; then
  ok "Migration completed (users table exists)"
else
  fail "Migration NOT completed (users table missing)"
  EXIT_CODE=1
fi

# 5. API smoke test
log "Test 5: API smoke test..."
AUTH_ENDPOINT="http://localhost:$BACKEND_PORT/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH_ENDPOINT" --connect-timeout 5 2>/dev/null)
if [ "$HTTP_CODE" = "200" ]; then
  ok "Health endpoint accessible (HTTP 200)"
else
  fail "Health endpoint not accessible (HTTP $HTTP_CODE)"
  EXIT_CODE=1
fi

# 6. Frontend test
log "Test 6: Frontend accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" --connect-timeout 5 2>/dev/null)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
  ok "Frontend is accessible (HTTP $HTTP_CODE)"
else
  fail "Frontend is not accessible (HTTP $HTTP_CODE)"
  EXIT_CODE=1
fi

# 7. CORS test
log "Test 7: CORS headers..."
CORS_HEADER=$(curl -s -I -X OPTIONS "http://localhost:$BACKEND_PORT/health" -H "Origin: $FRONTEND_URL" 2>/dev/null | grep -i "access-control-allow-origin" | head -1)
if [ -n "$CORS_HEADER" ]; then
  ok "CORS headers present"
else
  warn "CORS headers not found (may be expected for same-origin requests)"
fi

echo ""
echo "============================================="
if [ "$EXIT_CODE" -eq 0 ]; then
  echo -e "  ${GREEN}✓ All post-deployment tests passed!${NC}"
else
  echo -e "  ${RED}✗ Some post-deployment tests failed${NC}"
fi
echo "============================================="
echo ""

exit $EXIT_CODE
