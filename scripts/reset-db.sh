#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "Resetting database..."

docker compose exec postgres psql -U royale -d royale_platform -c "
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO royale;
"

echo "Running migrations..."
docker compose exec api alembic upgrade head 2>/dev/null || echo "No migrations to run yet"

echo "Database reset completed."
