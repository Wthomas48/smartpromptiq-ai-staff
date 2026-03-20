#!/bin/bash
# Database backup script for SmartPromptIQ
# Usage: ./scripts/backup.sh [output_dir]
#
# Requires DATABASE_URL environment variable to be set.
# Creates a timestamped pg_dump file.

set -e

OUTPUT_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${OUTPUT_DIR}/smartpromptiq_backup_${TIMESTAMP}.sql"

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Extract connection details from DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL is not set"
  echo "Set it in your .env file or export it"
  exit 1
fi

echo "Starting database backup..."
echo "Output: ${BACKUP_FILE}"

# Use pg_dump with the DATABASE_URL
pg_dump "$DATABASE_URL" --no-owner --no-acl > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"

echo "Backup complete: ${BACKUP_FILE}.gz"
echo "Size: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"

# Clean up old backups (keep last 10)
ls -t "${OUTPUT_DIR}"/smartpromptiq_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
echo "Old backups cleaned (keeping last 10)"
