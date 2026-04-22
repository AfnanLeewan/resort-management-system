#!/bin/bash

set -e

echo "🚀 Deploying Resort Management System - PRD"
echo "============================================"

# Remove old container if it exists (handles cross-project conflicts)
echo "🧹 Removing old container if it exists..."
docker rm -f resort-management-prd 2>/dev/null || true

docker compose \
  -f docker-compose.yml \
  -f docker-compose.prd.yml \
  up --build -d

echo ""
echo "✅ PRD deployment complete!"
echo "🌐 App is running at: http://localhost:80"
