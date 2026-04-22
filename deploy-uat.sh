#!/bin/bash

set -e

echo "🚀 Deploying Resort Management System - UAT"
echo "============================================"

docker compose \
  -f docker-compose.yml \
  -f docker-compose.uat.yml \
  up --build -d

echo ""
echo "✅ UAT deployment complete!"
echo "🌐 App is running at: http://localhost:8080"
