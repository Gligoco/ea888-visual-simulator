#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   export GH_USER="your-username"
#   export GH_TOKEN="ghp_xxx_with_repo_and_pages_scopes"
#   ./tools/deploy_github.sh [repo-name]
#
# This script will:
# - Create the repo if it doesn't exist
# - Push current branch to the remote
# - Enable GitHub Pages (workflow-based) and output the public URL

if [[ -z "${GH_USER:-}" || -z "${GH_TOKEN:-}" ]]; then
  echo "[deploy] Please export GH_USER and GH_TOKEN environment variables." >&2
  exit 1
fi

REPO_DIR="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_DIR"

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
REPO_NAME="${1:-$(basename "$REPO_DIR")}"
REMOTE_URL="https://github.com/${GH_USER}/${REPO_NAME}.git"
PUSH_URL="https://${GH_USER}:${GH_TOKEN}@github.com/${GH_USER}/${REPO_NAME}.git"

# Check if repo exists
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token ${GH_TOKEN}" \
  "https://api.github.com/repos/${GH_USER}/${REPO_NAME}")

if [[ "$HTTP_STATUS" == "404" ]]; then
  echo "[deploy] Creating repository ${GH_USER}/${REPO_NAME}..."
  CREATE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: token ${GH_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -d "{\"name\":\"${REPO_NAME}\",\"private\":false}" \
    https://api.github.com/user/repos)
  if [[ "$CREATE_STATUS" != "201" ]]; then
    echo "[deploy] Failed to create repo (status ${CREATE_STATUS})." >&2
    exit 1
  fi
else
  echo "[deploy] Repository ${GH_USER}/${REPO_NAME} already exists (status ${HTTP_STATUS})."
fi

# Set origin if not present
if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE_URL"
else
  git remote set-url origin "$REMOTE_URL"
fi

echo "[deploy] Pushing branch ${CURRENT_BRANCH} to ${GH_USER}/${REPO_NAME}..."
# Use token-embedded URL only for the push command (avoid storing token)
GIT_QUIET="-q"
if ! git push $GIT_QUIET "$PUSH_URL" "HEAD:refs/heads/${CURRENT_BRANCH}"; then
  echo "[deploy] Push failed." >&2
  exit 1
fi

echo "[deploy] Enabling GitHub Pages (workflow-based)..."
ENABLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT \
  -H "Authorization: token ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  -d '{"build_type":"workflow"}' \
  "https://api.github.com/repos/${GH_USER}/${REPO_NAME}/pages")

if [[ "$ENABLE_STATUS" != "201" && "$ENABLE_STATUS" != "204" ]]; then
  echo "[deploy] Warning: Could not enable Pages automatically (status ${ENABLE_STATUS}). The GitHub Actions workflow will likely configure it on first deploy." >&2
fi

PUBLIC_URL="https://${GH_USER}.github.io/${REPO_NAME}/"
echo "[deploy] Done. Your site will be available shortly at: ${PUBLIC_URL}"