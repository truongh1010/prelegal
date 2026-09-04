#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/docker.sh
source "$SCRIPT_DIR/lib/docker.sh"

prelegal_stop
