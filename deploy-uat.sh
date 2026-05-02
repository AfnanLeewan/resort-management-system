#!/bin/bash

set -e

echo "Deploying Resort Management System - UAT"
echo "========================================="

echo "Removing old UAT container if it exists..."
docker rm -f resort-management-uat 2>/dev/null || true

docker compose \
  -p resort-uat \
  -f docker-compose.yml \
  -f docker-compose.uat.yml \
  --env-file .env.uat \
  up --build -d

echo ""
echo "UAT deployment complete!"
echo "App is running at: http://localhost:3000"
