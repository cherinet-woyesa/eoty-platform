#!/bin/bash

# EOTY Platform Deployment Script
# This script helps deploy your application to production

set -e  # Exit on error

echo "🚀 Starting EOTY Platform Deployment..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if production environment file exists
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env file not found!${NC}"
    echo "Please create backend/.env from backend/.env.production.example"
    exit 1
fi

if [ ! -f "frontend/.env.production" ]; then
    echo -e "${YELLOW}⚠️  Warning: frontend/.env.production not found${NC}"
    echo "Using default configuration..."
fi

# Step 1: Install dependencies
echo -e "${GREEN}📦 Installing backend dependencies...${NC}"
cd backend
npm install --production

echo -e "${GREEN}📦 Installing frontend dependencies...${NC}"
cd ../frontend
npm install

# Step 2: Build frontend
echo -e "${GREEN}🏗️  Building frontend...${NC}"
npm run build

# Step 3: Run database migrations
echo -e "${GREEN}🗄️  Running database migrations...${NC}"
cd ../backend
npm run migrate

# Step 4: Run database seeds (optional - comment out if not needed)
# echo -e "${GREEN}🌱 Seeding database...${NC}"
# npm run seed

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Upload backend/ folder to your server"
echo "2. Upload frontend/dist/ folder to your static hosting"
echo "3. Configure your web server (nginx/apache)"
echo "4. Start the backend: cd backend && npm start"
echo ""
echo "Or use a platform like:"
echo "- Backend: Railway, Render, Heroku, DigitalOcean"
echo "- Frontend: Vercel, Netlify, Cloudflare Pages"
echo "- Database: Supabase, Railway, Render PostgreSQL"
