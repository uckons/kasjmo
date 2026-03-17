#!/usr/bin/env bash
set -euo pipefail
if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_file.dump>"
  exit 1
fi
: "${DB_HOST:?DB_HOST required}" "${DB_PORT:?DB_PORT required}" "${DB_NAME:?DB_NAME required}" "${DB_USER:?DB_USER required}" "${DB_PASSWORD:?DB_PASSWORD required}"
export PGPASSWORD="$DB_PASSWORD"
pg_restore -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --clean --if-exists "$1"
echo "Restore completed from $1"
