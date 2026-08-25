#!/usr/bin/env bash
# File: scripts/build-pr.sh

BRANCH_NAME=$1
if [ -z "$BRANCH_NAME" ]; then
  echo "Penggunaan: ./scripts/build-pr.sh <nama-branch>"
  exit 1
fi

git checkout main && git pull
git checkout -b "$BRANCH_NAME"

echo "🚀 Menjalankan OpenCode Builder (Low Cost)..."
opencode run --model opencode/deepseek-v4-flash \
  "Implementasikan kode sesuai petunjuk di implementation_plan.md dan @CODEBASE_CONTEXT.MD"

git add .
git commit -m "feat: implementasi fitur dari implementation_plan.md"
git push -u origin "$BRANCH_NAME"

gh pr create --fill