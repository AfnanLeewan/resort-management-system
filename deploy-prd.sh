#!/bin/bash

set -e

echo "Deploying Resort Management System - PRD"
echo "========================================="

echo "Removing old PRD container if it exists..."
docker rm -f resort-management-prd 2>/dev/null || true

docker compose \
  -p resort-prd \
  -f docker-compose.yml \
  -f docker-compose.prd.yml \
  --env-file .env.prd \
  up --build -d

echo ""
echo "PRD deployment complete!"
echo "App is running at: http://localhost:8080"
