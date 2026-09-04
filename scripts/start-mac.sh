#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# shellcheck source=lib/docker.sh
source "$SCRIPT_DIR/lib/docker.sh"

prelegal_require_docker \
  "Install Docker Desktop: https://www.docker.com/products/docker-desktop/" \
  "Start Docker Desktop and try again."

prelegal_start "$REPO_ROOT"
