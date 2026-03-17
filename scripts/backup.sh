#!/usr/bin/env bash
set -euo pipefail
: "${DB_HOST:?DB_HOST required}" "${DB_PORT:?DB_PORT required}" "${DB_NAME:?DB_NAME required}" "${DB_USER:?DB_USER required}" "${DB_PASSWORD:?DB_PASSWORD required}"
mkdir -p backups
export PGPASSWORD="$DB_PASSWORD"
FILE="backups/${DB_NAME}-$(date +%Y%m%d-%H%M%S).dump"
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -Fc "$DB_NAME" > "$FILE"
echo "Backup created: $FILE"
