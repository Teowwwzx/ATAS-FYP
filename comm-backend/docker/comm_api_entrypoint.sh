#!/usr/bin/env bash

set -euo pipefail

if [ "${RUN_MIGRATIONS:-0}" = "1" ]; then
  python -m app.scripts.migrate
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8001
