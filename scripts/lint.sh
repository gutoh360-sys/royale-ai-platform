#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Running ruff check..."
uv run ruff check .

echo "Running mypy..."
uv run mypy .

echo "Running bandit..."
uv run bandit -c pyproject.toml -r backend/

echo "Running import-linter..."
uv run import-linter
