#!/bin/bash

# ===========================================
# SIMAK Vokasi - Telegram Notification Script
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/../.deployment/deploy.config.sh" 2>/dev/null || true

send_telegram() {
  local message="$1"
  local parse_mode="${2:-Markdown}"
  local disable_notification="${3:-false}"

  if [ "$TELEGRAM_ENABLED" != "true" ]; then
    return
  fi

  if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
    echo "[WARNING] Telegram credentials not configured (TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID)"
    return
  fi

  local response
  response=$(curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    -d "text=$message" \
    -d "parse_mode=$parse_mode" \
    -d "disable_notification=$disable_notification" \
    -d "disable_web_page_preview=true" 2>&1)

  if echo "$response" | grep -q '"ok":true'; then
    echo "[OK] Telegram notification sent"
  else
    echo "[WARNING] Failed to send Telegram notification: $response"
  fi
}

send_deploy_success() {
  local branch="$1"
  local commit="$2"
  local duration="$3"
  local message="✅ *Deployment Successful* - $PROJECT_NAME

*Branch:* $branch
*Commit:* ${commit:0:7}
*Duration:* ${duration}s
*Time:* $(date '+%Y-%m-%d %H:%M:%S')

Services are running and healthy."
  send_telegram "$message"
}

send_deploy_failure() {
  local branch="$1"
  local commit="$2"
  local error="$3"
  local message="❌ *Deployment Failed* - $PROJECT_NAME

*Branch:* $branch
*Commit:* ${commit:0:7}
*Error:* $error
*Time:* $(date '+%Y-%m-%d %H:%M:%S')

Rollback may be required. Check logs for details."
  send_telegram "$message"
}

send_rollback_notification() {
  local backup_file="$1"
  local reason="$2"
  local message="🔄 *Rollback Initiated* - $PROJECT_NAME

*Backup:* $backup_file
*Reason:* $reason
*Time:* $(date '+%Y-%m-%d %H:%M:%S')

Services are being restored to previous state."
  send_telegram "$message"
}

send_health_alert() {
  local service="$1"
  local status="$2"
  local details="$3"
  local message="⚠️ *Health Alert* - $PROJECT_NAME

*Service:* $service
*Status:* $status
*Details:* $details
*Time:* $(date '+%Y-%m-%d %H:%M:%S')"
  send_telegram "$message" "Markdown" "true"
}

# Run directly if called as script
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  if [ $# -lt 2 ]; then
    echo "Usage: $0 <type> <message> [branch] [commit] [duration]"
    echo "Types: success, failure, rollback, health"
    exit 1
  fi

  TYPE="$1"
  shift

  case "$TYPE" in
    success) send_deploy_success "$1" "$2" "$3" ;;
    failure) send_deploy_failure "$1" "$2" "$3" ;;
    rollback) send_rollback_notification "$1" "$2" ;;
    health) send_health_alert "$1" "$2" "$3" ;;
    *) send_telegram "$1" ;;
  esac
fi
