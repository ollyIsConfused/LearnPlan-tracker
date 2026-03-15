#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/deploy-origin.sh --target user@host --repo-path /srv/learnplan-tracker --web-root /var/www/learnplan-tracker/dist [options]

Required:
  --target         SSH target in the form user@host
  --repo-path      Target directory for the repository on the server
  --web-root       Directory served by the origin webserver

Optional:
  --base-path      Vite base path for the production build, defaults to /
  --reload-cmd     Command run on the server after deployment, defaults to: sudo systemctl reload nginx
  --include-git    Sync the .git directory as well
  --skip-reload    Do not reload the webserver after deployment

Example:
  scripts/deploy-origin.sh \
    --target deploy@192.168.30.20 \
    --repo-path /srv/learnplan-tracker \
    --web-root /var/www/learnplan-tracker/dist \
    --base-path /
EOF
}

TARGET=""
REPO_PATH=""
WEB_ROOT=""
BASE_PATH="/"
RELOAD_CMD="sudo systemctl reload nginx"
SKIP_RELOAD="0"
INCLUDE_GIT="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="${2:-}"
      shift 2
      ;;
    --repo-path)
      REPO_PATH="${2:-}"
      shift 2
      ;;
    --web-root)
      WEB_ROOT="${2:-}"
      shift 2
      ;;
    --base-path)
      BASE_PATH="${2:-}"
      shift 2
      ;;
    --reload-cmd)
      RELOAD_CMD="${2:-}"
      shift 2
      ;;
    --skip-reload)
      SKIP_RELOAD="1"
      shift
      ;;
    --include-git)
      INCLUDE_GIT="1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$TARGET" || -z "$REPO_PATH" || -z "$WEB_ROOT" ]]; then
  usage
  exit 1
fi

RSYNC_EXCLUDES=(
  "--exclude" ".DS_Store"
  "--exclude" ".codex/"
  "--exclude" "node_modules/"
  "--exclude" "dist/"
)

if [[ "$INCLUDE_GIT" != "1" ]]; then
  RSYNC_EXCLUDES+=("--exclude" ".git/")
fi

echo "Sync repository to $TARGET:$REPO_PATH"
rsync -az --delete "${RSYNC_EXCLUDES[@]}" ./ "$TARGET:$REPO_PATH/"

REMOTE_SCRIPT=$(cat <<EOF
set -euo pipefail
cd "$REPO_PATH"
npm ci
VITE_BASE_PATH="$BASE_PATH" npm run build
mkdir -p "$WEB_ROOT"
rsync -az --delete dist/ "$WEB_ROOT"/
EOF
)

if [[ "$SKIP_RELOAD" != "1" ]]; then
  REMOTE_SCRIPT+=$'\n'"$RELOAD_CMD"
fi

echo "Build and publish on remote host"
ssh "$TARGET" "$REMOTE_SCRIPT"

echo "Deployment finished."
