# 📋 Pre-Deployment Checklist

Complete this checklist before deploying to production.

## 🔐 Security

- [ ] **JWT Secret**: Generated strong random secret (32+ characters)
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] **Database Password**: Strong password set (not default)
- [ ] **AWS Credentials**: Production keys configured (not development keys)
- [ ] **SMTP Credentials**: Production email service configured
- [ ] **Google OAuth**: Production client ID and secret
- [ ] **Environment Files**: `.env` files NOT committed to git
- [ ] **CORS Origins**: Updated to production domains only

## 🗄️ Database

- [ ] **PostgreSQL Ready**: Database server accessible
- [ ] **Database Created**: Database exists and is empty
- [ ] **Credentials Tested**: Can connect to database
- [ ] **Backup Strategy**: Automated backups configured
- [ ] **Migration Plan**: Know how to run migrations

## ☁️ Infrastructure

- [ ] **Domain Name**: Registered and DNS configured
- [ ] **SSL Certificate**: Ready (Let's Encrypt or purchased)
- [ ] **S3 Bucket**: Created and configured for video storage
- [ ] **CloudFront**: (Optional) CDN configured for S3
- [ ] **Email Service**: SMTP or service like SendGrid configured
- [ ] **Server Resources**: Adequate CPU/RAM (min 2GB RAM, 2 CPU)

## 📦 Code Preparation

- [ ] **Dependencies Updated**: `npm install` runs without errors
- [ ] **Build Tested**: Frontend builds successfully
- [ ] **Migrations Tested**: All migrations run successfully
- [ ] **Seeds Ready**: Initial data seeds prepared
- [ ] **Git Clean**: All changes committed
- [ ] **Version Tagged**: Release version tagged in git

## 🧪 Testing

- [ ] **Local Testing**: App works completely in development
- [ ] **API Endpoints**: All critical endpoints tested
- [ ] **Authentication**: Login/register/logout works
- [ ] **File Upload**: Video upload and playback works
- [ ] **Role-Based Access**: Admin/teacher/student roles work correctly
- [ ] **Database Queries**: No slow queries identified

## 📝 Configuration Files

- [ ] **backend/.env**: All production values set
- [ ] **frontend/.env.production**: API URL configured
- [ ] **nginx.conf**: Reviewed and customized if needed
- [ ] **docker-compose.yml**: Reviewed if using Docker

## 🚀 Deployment Method Chosen

Choose ONE:

- [ ] **Docker Deployment** (Recommended)
  - [ ] Docker & Docker Compose installed
  - [ ] docker-compose.yml configured
  - [ ] Reverse proxy configured
  
- [ ] **PaaS Deployment** (Railway/Vercel)
  - [ ] Railway account created
  - [ ] Vercel account created
  - [ ] GitHub repository connected
  
- [ ] **VPS Deployment**
  - [ ] Server provisioned
  - [ ] Node.js installed
  - [ ] PostgreSQL installed
  - [ ] Nginx installed
  - [ ] PM2 installed

## 📊 Monitoring

- [ ] **Health Checks**: Uptime monitoring configured
- [ ] **Error Tracking**: Error logging set up
- [ ] **Performance Monitoring**: APM tool configured (optional)
- [ ] **Log Rotation**: Log management configured

## 📚 Documentation

- [ ] **Deployment Guide**: Read DEPLOYMENT_GUIDE.md
- [ ] **Admin Credentials**: Secure storage for admin passwords
- [ ] **API Documentation**: Available for team
- [ ] **Runbook**: Emergency procedures documented

## 🔄 Post-Deployment Plan

- [ ] **Smoke Tests**: List of tests to run after deployment
- [ ] **Rollback Plan**: Know how to rollback if needed
- [ ] **Team Notification**: Team knows about deployment
- [ ] **User Communication**: Users notified if needed

## ✅ Final Checks

- [ ] **All Above Items**: Completed
- [ ] **Backup Created**: Current state backed up
- [ ] **Team Available**: Support team ready
- [ ] **Time Allocated**: Enough time for deployment + testing

---

## 🚨 Emergency Contacts

- **DevOps Lead**: _________________
- **Database Admin**: _________________
- **AWS Support**: _________________
- **Domain Registrar**: _________________

---

## 📞 Support Resources

- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`
- **Quick Deploy Script**: `./quick-deploy.sh`
- **Docker Compose**: `docker-compose.yml`
- **Health Check**: `https://your-domain.com/health`

---

**Date Completed**: _______________
**Deployed By**: _______________
**Deployment Method**: _______________

**Ready to Deploy?** ✅

Run: `./quick-deploy.sh`
