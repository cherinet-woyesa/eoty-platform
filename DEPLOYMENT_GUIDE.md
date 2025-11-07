# 🚀 EOTY Platform Deployment Guide

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Options](#deployment-options)
3. [Option 1: Docker Deployment (Recommended)](#option-1-docker-deployment)
4. [Option 2: Platform-as-a-Service (PaaS)](#option-2-platform-as-a-service)
5. [Option 3: Traditional VPS](#option-3-traditional-vps)
6. [Post-Deployment Steps](#post-deployment-steps)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### 1. Security Configuration

**Backend Environment Variables:**
```bash
# Copy the example file
cp backend/.env.production.example backend/.env

# Generate a strong JWT secret (32+ characters)
# You can use: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Update these critical values in `backend/.env`:**
- ✅ `JWT_SECRET` - Generate a strong random secret
- ✅ `DB_PASSWORD` - Use a strong database password
- ✅ `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` - Your AWS credentials
- ✅ `SMTP_USER` & `SMTP_PASSWORD` - Email service credentials
- ✅ `FRONTEND_URL` - Your production domain
- ✅ `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - OAuth credentials

**Frontend Environment Variables:**
```bash
# Create production env file
cp frontend/.env.production.example frontend/.env.production

# Update VITE_API_BASE_URL to your backend URL
```

### 2. Database Preparation

Ensure you have a PostgreSQL database ready:
- PostgreSQL 14+ recommended
- At least 2GB RAM allocated
- Automated backups enabled

### 3. AWS S3 Setup (for video storage)

- Create an S3 bucket
- Configure CORS policy
- Set up CloudFront distribution (optional but recommended)
- Create IAM user with S3 access

---

## Deployment Options

### Option 1: Docker Deployment (Recommended) ⭐

**Best for:** Full control, easy scaling, consistent environments

#### Prerequisites
- Docker & Docker Compose installed
- Domain name configured
- SSL certificate (Let's Encrypt recommended)

#### Steps:

1. **Clone and configure:**
```bash
git clone <your-repo>
cd eoty-platform

# Configure environment
cp backend/.env.production.example backend/.env
# Edit backend/.env with your production values
```

2. **Build and run:**
```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f
```

3. **Run migrations:**
```bash
docker-compose exec backend npm run migrate
docker-compose exec backend npm run seed
```

4. **Configure reverse proxy (nginx on host):**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

5. **Set up SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

### Option 2: Platform-as-a-Service (PaaS)

**Best for:** Quick deployment, managed infrastructure, less DevOps

#### Recommended Platforms:

**Backend: Railway / Render / Heroku**

**Railway (Recommended):**
1. Sign up at railway.app
2. Create new project
3. Add PostgreSQL database
4. Deploy from GitHub:
   - Connect your repository
   - Set root directory to `backend`
   - Add environment variables
   - Deploy!

**Frontend: Vercel / Netlify / Cloudflare Pages**

**Vercel (Recommended):**
1. Sign up at vercel.com
2. Import your repository
3. Configure:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables:
   - `VITE_API_BASE_URL=https://your-backend.railway.app/api`
5. Deploy!

**Database: Supabase / Railway / Render**

**Supabase (Recommended):**
1. Create project at supabase.com
2. Get connection string
3. Update backend .env with connection details
4. Run migrations from local:
```bash
DATABASE_URL=<supabase-connection-string> npm run migrate
```

---

### Option 3: Traditional VPS (DigitalOcean, AWS EC2, Linode)

**Best for:** Maximum control, custom configurations

#### Prerequisites:
- Ubuntu 22.04 LTS server
- At least 2GB RAM, 2 CPU cores
- Domain name pointing to server IP

#### Steps:

1. **Initial server setup:**
```bash
# SSH into server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install nginx
apt install -y nginx

# Install PM2 (process manager)
npm install -g pm2
```

2. **Setup PostgreSQL:**
```bash
sudo -u postgres psql

CREATE DATABASE eoty_platform;
CREATE USER eoty_user WITH PASSWORD 'your-strong-password';
GRANT ALL PRIVILEGES ON DATABASE eoty_platform TO eoty_user;
\q
```

3. **Deploy backend:**
```bash
# Create app directory
mkdir -p /var/www/eoty-platform
cd /var/www/eoty-platform

# Clone or upload your code
git clone <your-repo> .

# Install backend dependencies
cd backend
npm install --production

# Configure environment
cp .env.production.example .env
nano .env  # Edit with your values

# Run migrations
npm run migrate
npm run seed

# Start with PM2
pm2 start server.js --name eoty-backend
pm2 save
pm2 startup
```

4. **Deploy frontend:**
```bash
cd /var/www/eoty-platform/frontend

# Install dependencies
npm install

# Build
npm run build

# Copy to nginx directory
cp -r dist/* /var/www/html/
```

5. **Configure nginx:**
```bash
nano /etc/nginx/sites-available/eoty-platform
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/eoty-platform /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# Setup SSL
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

---

## Post-Deployment Steps

### 1. Verify Deployment

**Check backend health:**
```bash
curl https://your-domain.com/health
```

**Check frontend:**
- Visit https://your-domain.com
- Try logging in
- Test video upload/playback

### 2. Create Admin User

```bash
# SSH into backend server or use Docker exec
cd backend
node -e "
const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function createAdmin() {
  const hash = await bcrypt.hash('admin-password', 10);
  await db('users').insert({
    first_name: 'Admin',
    last_name: 'User',
    email: 'admin@your-domain.com',
    password_hash: hash,
    role: 'platform_admin',
    chapter_id: 1,
    is_active: true
  });
  console.log('Admin created!');
  process.exit(0);
}
createAdmin();
"
```

### 3. Configure Monitoring

**Set up PM2 monitoring (if using PM2):**
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

**Set up uptime monitoring:**
- Use UptimeRobot (free)
- Monitor: https://your-domain.com/health

### 4. Setup Backups

**Database backups:**
```bash
# Create backup script
cat > /root/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U eoty_user eoty_platform > /backups/db_$DATE.sql
# Keep only last 7 days
find /backups -name "db_*.sql" -mtime +7 -delete
EOF

chmod +x /root/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /root/backup-db.sh
```

---

## Monitoring & Maintenance

### Health Checks

**Backend health endpoint:**
```
GET /health
Response: { "status": "healthy", "timestamp": "...", "uptime": 12345 }
```

### Logs

**Docker:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

**PM2:**
```bash
pm2 logs eoty-backend
pm2 monit
```

### Updates

**Docker deployment:**
```bash
git pull
docker-compose build
docker-compose up -d
docker-compose exec backend npm run migrate
```

**PM2 deployment:**
```bash
cd /var/www/eoty-platform
git pull
cd backend && npm install
npm run migrate
pm2 restart eoty-backend
```

---

## Troubleshooting

### Common Issues

**1. CORS errors:**
- Check `FRONTEND_URL` in backend .env
- Verify CORS configuration in `backend/app.js`

**2. Database connection failed:**
- Verify database credentials
- Check if PostgreSQL is running
- Test connection: `psql -h <host> -U <user> -d <database>`

**3. Videos not playing:**
- Check AWS S3 credentials
- Verify S3 bucket CORS policy
- Check CloudFront configuration

**4. 502 Bad Gateway:**
- Backend not running: `pm2 status` or `docker-compose ps`
- Check backend logs
- Verify nginx configuration

---

## Security Checklist

- [ ] Strong JWT_SECRET (32+ characters)
- [ ] Strong database password
- [ ] SSL/HTTPS enabled
- [ ] Firewall configured (only ports 80, 443, 22 open)
- [ ] Database not publicly accessible
- [ ] Environment variables not in git
- [ ] Regular security updates
- [ ] Automated backups enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured

---

## Support

For issues or questions:
1. Check logs first
2. Review this guide
3. Check GitHub issues
4. Contact support team

**Happy Deploying! 🚀**
