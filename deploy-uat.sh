#!/bin/bash

set -e

echo "🚀 Deploying Resort Management System - UAT"
echo "============================================"

# Remove old container if it exists (handles cross-project conflicts)
echo "🧹 Removing old container if it exists..."
docker rm -f resort-management-uat 2>/dev/null || true

docker compose \
  -f docker-compose.yml \
  -f docker-compose.uat.yml \
  up --build -d

echo ""
echo "✅ UAT deployment complete!"
echo "🌐 App is running at: http://localhost:8080"
