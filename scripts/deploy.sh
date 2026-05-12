#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UAT_WORKTREE="/tmp/resort-build-uat"
PRD_WORKTREE="/tmp/resort-build-prd"

usage() {
  echo "Usage: $0 [uat|prd|both]"
  exit 1
}

cleanup_worktree() {
  local path="$1"
  if [ -d "$path" ]; then
    git -C "$REPO_ROOT" worktree remove --force "$path" 2>/dev/null || true
    rm -rf "$path"
  fi
}

deploy_uat() {
  echo "==> Deploying UAT from uat-main on port 3000..."
  cleanup_worktree "$UAT_WORKTREE"
  git -C "$REPO_ROOT" worktree add "$UAT_WORKTREE" uat-main
  docker-compose -p resort-uat \
    -f "$UAT_WORKTREE/docker-compose.yml" \
    -f "$UAT_WORKTREE/docker-compose.uat.yml" \
    --env-file "$REPO_ROOT/.env.uat" \
    up -d --build
  cleanup_worktree "$UAT_WORKTREE"
  echo "==> UAT running at http://localhost:3000"
}

deploy_prd() {
  echo "==> Deploying PRD from prod-main on port 8080..."
  cleanup_worktree "$PRD_WORKTREE"
  git -C "$REPO_ROOT" worktree add "$PRD_WORKTREE" prod-main
  docker-compose -p resort-prd \
    -f "$PRD_WORKTREE/docker-compose.yml" \
    -f "$PRD_WORKTREE/docker-compose.prd.yml" \
    --env-file "$REPO_ROOT/.env.prd" \
    up -d --build
  cleanup_worktree "$PRD_WORKTREE"
  echo "==> PRD running at http://localhost:8080"
}

TARGET="${1:-both}"

case "$TARGET" in
  uat)  deploy_uat ;;
  prd)  deploy_prd ;;
  both) deploy_uat; deploy_prd ;;
  *)    usage ;;
esac
