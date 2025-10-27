#!/bin/bash

# Simple script to test the Docker setup

echo "Testing EOTY Platform Docker Setup"

# Build the containers
echo "Building containers..."
docker-compose build

# Start the services
echo "Starting services..."
docker-compose up -d

# Wait a few seconds for services to start
echo "Waiting for services to start..."
sleep 10

# Check if services are running
echo "Checking service status..."
docker-compose ps

# Test the backend health endpoint
echo "Testing backend health check..."
curl -f http://localhost:5000/api/health || echo "Backend health check failed"

# Test the frontend (this might take a moment to be ready)
echo "Testing frontend..."
curl -f http://localhost:3000 || echo "Frontend test failed"

# Show logs
echo "Showing recent logs..."
docker-compose logs --tail=20

echo "Test complete!"