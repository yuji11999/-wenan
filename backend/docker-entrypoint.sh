#!/bin/sh
set -e

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${JWT_SECRET:?JWT_SECRET is required}"
: "${ENCRYPTION_KEY:?ENCRYPTION_KEY is required}"

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting backend..."
exec "$@"
