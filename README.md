# EOTY Platform - Docker Setup

This document explains how to set up and run the EOTY Platform using Docker.

## Prerequisites

- Docker Engine 20.10+ installed
- Docker Compose 1.29+ installed

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd eoty-platform
   ```

2. Copy the example environment file and configure it:
   ```bash
   cp .env.example .env
   # Edit .env file with your configuration
   ```

3. **Important Security Note**: 
   The repository includes a `.env.example` file showing the required environment variables. 
   You should never commit actual credentials to version control. The `.gitignore` file 
   is configured to exclude `.env` files from being committed.

4. Build and start the services:
   ```bash
   docker-compose up --build
   ```

5. Access the application:
   - Frontend: http://localhost
   - Backend API: http://localhost/api/
   - Database: localhost:5432 (PostgreSQL)

## Development Mode

For development with hot-reloading:

```bash
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

## Services Overview

- **Frontend**: React application served by Nginx
- **Backend**: Node.js/Express API
- **Database**: PostgreSQL with pgvector extension
- **Redis**: Caching and session storage
- **Nginx**: Reverse proxy and load balancer

## Environment Variables

See `.env.example` for all required environment variables.

**Security Warning**: Never commit your `.env` file to version control as it contains sensitive information like database passwords, API keys, and secrets.

## Database Migrations

To run database migrations:

```bash
docker-compose exec backend npm run migrate
```

## Stopping the Services

```bash
docker-compose down
```

To stop and remove volumes (data will be lost):

```bash
docker-compose down -v
```