#!/bin/bash

# Quick Deploy Script for EOTY Platform
# This script helps you choose and execute the right deployment method

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║   EOTY Platform Deployment Assistant      ║"
echo "╔═══════════════════════════════════════════╗"
echo -e "${NC}"

# Check if .env files exist
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Backend .env file not found!${NC}"
    echo "Creating from example..."
    cp backend/.env.production.example backend/.env
    echo -e "${RED}❗ IMPORTANT: Edit backend/.env with your production values before continuing!${NC}"
    exit 1
fi

echo "Choose your deployment method:"
echo ""
echo "1) 🐳 Docker (Recommended - Full stack with database)"
echo "2) 🚂 Railway + Vercel (PaaS - Easiest)"
echo "3) 🖥️  VPS Manual Setup (Advanced)"
echo "4) 📦 Build for manual deployment"
echo "5) ❌ Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo -e "${GREEN}🐳 Starting Docker deployment...${NC}"
        
        # Check if Docker is installed
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
            exit 1
        fi
        
        echo "Building Docker images..."
        docker-compose build
        
        echo "Starting services..."
        docker-compose up -d
        
        echo "Waiting for database to be ready..."
        sleep 10
        
        echo "Running database migrations..."
        docker-compose exec -T backend npm run migrate
        
        echo ""
        echo -e "${GREEN}✅ Deployment complete!${NC}"
        echo ""
        echo "Your application is running at:"
        echo "  Frontend: http://localhost"
        echo "  Backend:  http://localhost:5000"
        echo ""
        echo "To view logs: docker-compose logs -f"
        echo "To stop: docker-compose down"
        ;;
        
    2)
        echo -e "${GREEN}🚂 Preparing for Railway + Vercel deployment...${NC}"
        echo ""
        echo "Follow these steps:"
        echo ""
        echo "📦 Backend (Railway):"
        echo "  1. Go to railway.app and sign up"
        echo "  2. Create new project"
        echo "  3. Add PostgreSQL database"
        echo "  4. Deploy from GitHub:"
        echo "     - Root directory: backend"
        echo "     - Add all environment variables from backend/.env"
        echo "  5. Copy your Railway backend URL"
        echo ""
        echo "🎨 Frontend (Vercel):"
        echo "  1. Go to vercel.com and sign up"
        echo "  2. Import your repository"
        echo "  3. Configure:"
        echo "     - Framework: Vite"
        echo "     - Root Directory: frontend"
        echo "     - Build Command: npm run build"
        echo "     - Output Directory: dist"
        echo "  4. Add environment variable:"
        echo "     VITE_API_BASE_URL=<your-railway-backend-url>/api"
        echo "  5. Deploy!"
        echo ""
        echo "Press Enter to continue..."
        read
        ;;
        
    3)
        echo -e "${GREEN}🖥️  VPS Manual Setup Guide${NC}"
        echo ""
        echo "Please follow the detailed guide in DEPLOYMENT_GUIDE.md"
        echo "Section: 'Option 3: Traditional VPS'"
        echo ""
        echo "Quick checklist:"
        echo "  ✓ Ubuntu 22.04 LTS server"
        echo "  ✓ Node.js 18+ installed"
        echo "  ✓ PostgreSQL installed"
        echo "  ✓ Nginx installed"
        echo "  ✓ PM2 installed globally"
        echo "  ✓ Domain pointing to server"
        echo ""
        ;;
        
    4)
        echo -e "${GREEN}📦 Building for manual deployment...${NC}"
        
        # Build frontend
        echo "Building frontend..."
        cd frontend
        npm install
        npm run build
        cd ..
        
        # Install backend dependencies
        echo "Installing backend dependencies..."
        cd backend
        npm install --production
        cd ..
        
        echo ""
        echo -e "${GREEN}✅ Build complete!${NC}"
        echo ""
        echo "Files ready for deployment:"
        echo "  📁 backend/ - Upload to your server"
        echo "  📁 frontend/dist/ - Upload to static hosting or nginx"
        echo ""
        echo "Next steps:"
        echo "  1. Upload backend/ to your server"
        echo "  2. Set up PostgreSQL database"
        echo "  3. Configure backend/.env"
        echo "  4. Run: npm run migrate && npm start"
        echo "  5. Upload frontend/dist/ to web server"
        echo ""
        ;;
        
    5)
        echo "Exiting..."
        exit 0
        ;;
        
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${GREEN}For detailed instructions, see DEPLOYMENT_GUIDE.md${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
