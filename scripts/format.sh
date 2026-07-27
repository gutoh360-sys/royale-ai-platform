#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Running ruff format..."
uv run ruff format .

echo "Running ruff check --fix..."
uv run ruff check --fix . 2>/dev/null || echo "No fixable issues found"
