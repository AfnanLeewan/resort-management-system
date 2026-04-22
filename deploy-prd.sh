#!/bin/bash

set -e

echo "🚀 Deploying Resort Management System - PRD"
echo "============================================"

docker compose \
  -f docker-compose.yml \
  -f docker-compose.prd.yml \
  up --build --force-recreate -d

echo ""
echo "✅ PRD deployment complete!"
echo "🌐 App is running at: http://localhost:80"
