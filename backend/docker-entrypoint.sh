#!/bin/bash
set -e

# Activate virtual environment
source /opt/venv/bin/activate

# Optional: Wait for DB to be ready

# Run vector DB setup only if the script exists
if [ -f "app/database/ensure_pgvector_tables.py" ]; then
    echo "Running pgvector setup..."
    python -m app.database.ensure_pgvector_tables
else
    echo "Skipping pgvector setup (script not found)..."
fi

# Run Alembic migrations (Uncomment if you want auto-migration on startup)
echo "Running database migrations..."
alembic upgrade head

# Exec the passed command
exec "$@"
