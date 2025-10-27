@echo off
echo Testing EOTY Platform Docker Setup

REM Build the containers
echo Building containers...
docker-compose build

REM Start the services
echo Starting services...
docker-compose up -d

REM Wait a few seconds for services to start
echo Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Check if services are running
echo Checking service status...
docker-compose ps

REM Test the backend health endpoint
echo Testing backend health check...
curl -f http://localhost:5000/api/health || echo Backend health check failed

REM Test the frontend (this might take a moment to be ready)
echo Testing frontend...
curl -f http://localhost:3000 || echo Frontend test failed

REM Show logs
echo Showing recent logs...
docker-compose logs --tail=20

echo Test complete!