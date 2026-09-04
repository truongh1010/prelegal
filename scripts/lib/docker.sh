#!/usr/bin/env bash
# Shared docker build/run/stop logic used by the Mac and Linux start/stop scripts.
# Not meant to be run directly - source it from a platform entry point.

IMAGE_NAME="prelegal"
CONTAINER_NAME="prelegal"
PORT=8000

prelegal_require_docker() {
  local install_hint="$1"
  local not_running_hint="$2"

  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is required but was not found on PATH. $install_hint" >&2
    exit 1
  fi

  if ! docker info >/dev/null 2>&1; then
    echo "Docker is installed but not running. $not_running_hint" >&2
    exit 1
  fi
}

prelegal_start() {
  local repo_root="$1"
  local env_file_args=()

  if [ -f "$repo_root/.env" ]; then
    env_file_args=(--env-file "$repo_root/.env")
  else
    echo "Warning: $repo_root/.env not found. Continuing without it (OPENAI_API_KEY will be unset)." >&2
  fi

  echo "Building $IMAGE_NAME image..."
  docker build -t "$IMAGE_NAME" "$repo_root"

  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Removing existing $CONTAINER_NAME container..."
    docker rm -f "$CONTAINER_NAME" >/dev/null
  fi

  echo "Starting $CONTAINER_NAME on http://localhost:$PORT ..."
  docker run -d --name "$CONTAINER_NAME" -p "$PORT:8000" "${env_file_args[@]}" "$IMAGE_NAME" >/dev/null

  echo "Prelegal is running at http://localhost:$PORT"
}

prelegal_stop() {
  if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    echo "Stopping $CONTAINER_NAME..."
    docker rm -f "$CONTAINER_NAME" >/dev/null
    echo "Stopped."
  else
    echo "$CONTAINER_NAME is not running."
  fi
}
