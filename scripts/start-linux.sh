#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/docker.sh
source "$SCRIPT_DIR/lib/docker.sh"

prelegal_require_docker \
  "Install it: https://docs.docker.com/engine/install/" \
  "Start it (e.g. 'sudo systemctl start docker') and try again."

prelegal_start "$REPO_ROOT"
