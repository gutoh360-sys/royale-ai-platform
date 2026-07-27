#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Starting Royale Platform..."
docker compose up -d

echo "Waiting for services..."
sleep 5

echo "Running migrations..."
docker compose exec api alembic upgrade head 2>/dev/null || echo "No migrations to run yet"

echo "Royale Platform is running!"
echo "  API:       http://localhost:8000"
echo "  MinIO:     http://localhost:9001"
echo "  PostgreSQL: localhost:5432"
echo "  Redis:     localhost:6379"
