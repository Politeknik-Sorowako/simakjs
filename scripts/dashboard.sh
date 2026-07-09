#!/bin/bash

# ===========================================
# SIMAK Vokasi - Dashboard Monitoring
# ===========================================
# Usage:
#   ./dashboard.sh              # Show interactive dashboard
#   ./dashboard.sh --once       # Show once and exit
#   ./dashboard.sh --json       # Output JSON once
#   ./dashboard.sh --help       # Show help

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.deployment/deploy.config.sh"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

show_once() {
  local format="${1:-text}"
  
  if [ "$format" = "json" ]; then
    bash "$SCRIPT_DIR/health-check.sh" json
    return
  fi
  
  clear
  echo -e "${BOLD}=============================================${NC}"
  echo -e "${BOLD}    SIMAK Vokasi - Monitoring Dashboard${NC}"
  echo -e "${BOLD}    $(date '+%Y-%m-%d %H:%M:%S')${NC}"
  echo -e "${BOLD}=============================================${NC}"
  echo ""
  
  # Container status
  echo -e "${CYAN}Container Status:${NC}"
  if docker ps --filter "name=simak_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null | grep -q "simak"; then
    docker ps --filter "name=simak_" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null
  else
    echo -e "  ${RED}No SIMAK containers running${NC}"
  fi
  echo ""
  
  # Resource usage
  echo -e "${CYAN}Resource Usage:${NC}"
  if docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" 2>/dev/null | grep -q "simak"; then
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}" 2>/dev/null | grep -E "simak|Name"
  else
    echo -e "  ${YELLOW}No stats available${NC}"
  fi
  echo ""
  
  # System resources
  echo -e "${CYAN}System Resources:${NC}"
  echo -e "  CPU:    $(grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5); printf "%.1f%%", usage}')"
  echo -e "  Memory: $(free -h | awk 'NR==2 {print $3"/"$2}')"
  echo -e "  Disk:   $(df -h / | awk 'NR==2 {print $3"/"$2" ("$5")"}')"
  echo ""
  
  # API health
  echo -e "${CYAN}API Health:${NC}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" --connect-timeout 5 2>/dev/null)
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "  ${GREEN}✓ API: HTTP $HTTP_CODE${NC}"
  else
    echo -e "  ${RED}✗ API: HTTP $HTTP_CODE${NC}"
  fi
  
  # Frontend
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" --connect-timeout 5 2>/dev/null)
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ] || [ "$HTTP_CODE" = "301" ]; then
    echo -e "  ${GREEN}✓ Frontend: HTTP $HTTP_CODE${NC}"
  else
    echo -e "  ${RED}✗ Frontend: HTTP $HTTP_CODE${NC}"
  fi
  echo ""
  
  # Database
  echo -e "${CYAN}Database:${NC}"
  if docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1" &>/dev/null; then
    echo -e "  ${GREEN}✓ Database connected${NC}"
    
    # Table count
    TABLES=$(docker exec "$DB_CONTAINER" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
    echo -e "    Tables: $TABLES"
  else
    echo -e "  ${RED}✗ Database disconnected${NC}"
  fi
  echo ""
  
  # Recent deployments
  echo -e "${CYAN}Recent Deployments:${NC}"
  ls -lt "$SCRIPT_DIR"/deploy-*.log 2>/dev/null | head -3 | while read -r LOG; do
    LOG_NAME=$(basename "$LOG")
    LOG_SIZE=$(du -h "$LOG" | cut -f1)
    echo -e "  $LOG_NAME ($LOG_SIZE)"
  done
  echo ""
  
  # Backup status
  echo -e "${CYAN}Backups:${NC}"
  BACKUP_COUNT=$(ls "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | wc -l)
  if [ "$BACKUP_COUNT" -gt 0 ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR"/backup-*.sql.gz 2>/dev/null | head -1)
    LATEST_SIZE=$(du -h "$LATEST_BACKUP" 2>/dev/null | cut -f1)
    echo -e "  Total backups: $BACKUP_COUNT"
    echo -e "  Latest: $(basename "$LATEST_BACKUP" 2>/dev/null) ($LATEST_SIZE)"
  else
    echo -e "  ${YELLOW}No backups found${NC}"
  fi
  echo ""
}

interactive() {
  while true; do
    show_once
    echo -e "${YELLOW}Press Ctrl+C to exit, refreshing in 5 seconds...${NC}"
    sleep 5
  done
}

# Handle arguments
case "${1:-}" in
  --once|-1|once)
    show_once
    ;;
  --json|json)
    show_once json
    ;;
  --help|-h|help)
    echo "Usage: $0 [option]"
    echo "  (no option)   Interactive dashboard (refreshes every 5s)"
    echo "  --once        Show once and exit"
    echo "  --json        Output JSON once"
    echo "  --help        Show this help"
    ;;
  *)
    interactive
    ;;
esac
