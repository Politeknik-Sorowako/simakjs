#!/bin/bash

# ===========================================
# SIMAK Vokasi - Health Check Script
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.deployment/deploy.config.sh" 2>/dev/null || true

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${CYAN}[$(date +'%H:%M:%S')]${NC} $1"; }
ok() { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }

check_container() {
  local name="$1"
  local status
  status=$(docker ps --filter "name=$name" --format "{{.Status}}" 2>/dev/null)

  if [ -n "$status" ]; then
    ok "Container $name is running ($status)"
    return 0
  else
    fail "Container $name is NOT running"
    return 1
  fi
}

check_database() {
  local result
  result=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" 2>/dev/null)

  if [ "$result" = " ?column? 
----------
        1
(1 row)" ]; then
    ok "Database connection successful"
    return 0
  else
    fail "Database connection failed"
    return 1
  fi
}

check_tables() {
  local tables
  tables=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')

  if [ -n "$tables" ] && [ "$tables" -gt 0 ]; then
    ok "Database has $tables tables"
    return 0
  else
    fail "No tables found in database"
    return 1
  fi
}

check_api() {
  local http_code

  # Use docker exec for internal health check (works on remote VPS)
  http_code=$(docker exec "$BACKEND_CONTAINER" curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/health --connect-timeout "$HEALTH_CHECK_TIMEOUT" 2>/dev/null)

  if [ "$http_code" = "200" ]; then
    ok "API health endpoint returned HTTP 200"
    return 0
  else
    fail "API health endpoint returned HTTP $http_code"
    return 1
  fi
}

check_frontend() {
  local http_code

  # Check frontend via Docker internal network (backend → frontend)
  http_code=$(docker exec "$BACKEND_CONTAINER" curl -s -o /dev/null -w "%{http_code}" http://$FRONTEND_CONTAINER:80 --connect-timeout "$HEALTH_CHECK_TIMEOUT" 2>/dev/null)

  if [ "$http_code" = "200" ] || [ "$http_code" = "302" ] || [ "$http_code" = "301" ]; then
    ok "Frontend is accessible (HTTP $http_code)"
    return 0
  else
    fail "Frontend is not accessible (HTTP $http_code)"
    return 1
  fi
}

check_migration() {
  local tables_found
  tables_found=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name='users');" 2>/dev/null | tr -d ' ')

  if [ "$tables_found" = "t" ]; then
    ok "Migration completed (users table exists)"
    return 0
  else
    fail "Migration NOT completed (users table missing)"
    return 1
  fi
}

check_disk_space() {
  local usage
  usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

  if [ "$usage" -lt 80 ]; then
    ok "Disk space usage: $usage%"
    return 0
  elif [ "$usage" -lt 90 ]; then
    warn "Disk space usage: $usage% (above 80%)"
    return 0
  else
    fail "Disk space usage: $usage% (above 90%)"
    return 1
  fi
}

check_memory() {
  local total used
  total=$(free -m | awk 'NR==2 {print $2}')
  used=$(free -m | awk 'NR==2 {print $3}')
  local percent=$((used * 100 / total))

  if [ "$percent" -lt 80 ]; then
    ok "Memory usage: ${percent}% (${used}MB / ${total}MB)"
    return 0
  elif [ "$percent" -lt 90 ]; then
    warn "Memory usage: ${percent}% (${used}MB / ${total}MB)"
    return 0
  else
    fail "Memory usage: ${percent}% (${used}MB / ${total}MB)"
    return 1
  fi
}

run_all_checks() {
  local exit_code=0
  local format="${1:-text}"

  if [ "$format" = "json" ]; then
    # JSON output for dashboard
    local results="{"
    results+="\"timestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
    
    container_status=$(docker ps --filter "name=simak_" --format "{{.Names}}" 2>/dev/null | tr '\n' ',' | sed 's/,$//')
    results+="\"containers\":\"$container_status\","
    
    db_ok=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" 2>/dev/null && echo "true" || echo "false")
    results+="\"database\":$db_ok,"
    
    api_http=$(docker exec "$BACKEND_CONTAINER" curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/health --connect-timeout "$HEALTH_CHECK_TIMEOUT" 2>/dev/null)
    results+="\"api_http\":${api_http:-0},"
    
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    mem_usage=$(free -m | awk 'NR==2 {printf "%.0f", $3*100/$2}')
    results+="\"disk_usage\":$disk_usage,"
    results+="\"memory_usage\":$mem_usage"
    results+="}"
    
    echo "$results"
    return
  fi

  echo ""
  echo "============================================="
  echo "    SIMAK Vokasi - Health Check Report"
  echo "    $(date '+%Y-%m-%d %H:%M:%S')"
  echo "============================================="
  echo ""

  log "Checking Docker containers..."
  check_container "$BACKEND_CONTAINER" || exit_code=1
  check_container "$DB_CONTAINER" || exit_code=1
  check_container "$FRONTEND_CONTAINER" || exit_code=1

  echo ""
  log "Checking Services..."
  check_api || exit_code=1
  check_frontend || exit_code=1

  echo ""
  log "Checking Database..."
  check_database || exit_code=1
  check_migration || exit_code=1
  check_tables || exit_code=1

  echo ""
  log "Checking System Resources..."
  check_disk_space || exit_code=1
  check_memory || exit_code=1

  echo ""
  if [ "$exit_code" -eq 0 ]; then
    echo -e "  ${GREEN}✓ All checks passed!${NC}"
  else
    echo -e "  ${RED}✗ Some checks failed${NC}"
  fi
  echo ""

  return $exit_code
}

# Run directly if called as script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  format="${1:-text}"
  run_all_checks "$format"
  exit $?
fi
