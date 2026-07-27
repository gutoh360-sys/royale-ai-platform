#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

ACTION="${1:-upgrade}"

case "$ACTION" in
  upgrade)
    echo "Running migrations upgrade..."
    uv run alembic upgrade head
    ;;
  downgrade)
    REVISION="${2:--1}"
    echo "Rolling back to revision: $REVISION"
    uv run alembic downgrade "$REVISION"
    ;;
  create)
    MESSAGE="${2:-new_migration}"
    echo "Creating new migration: $MESSAGE"
    uv run alembic revision --autogenerate -m "$MESSAGE"
    ;;
  history)
    echo "Migration history:"
    uv run alembic history
    ;;
  *)
    echo "Usage: $0 {upgrade|downgrade|create|history} [args]"
    exit 1
    ;;
esac
