# EOTY Platform Deployment Checklist

## Pre-deployment Requirements

### 1. Environment Variables Configuration
Before deploying, ensure all required environment variables are set in your production environment:

#### Database Configuration
- [ ] `DB_HOST` - Database host
- [ ] `DB_PORT` - Database port (usually 5432 for PostgreSQL)
- [ ] `DB_USER` - Database username
- [ ] `DB_PASSWORD` - Database password
- [ ] `DB_NAME` - Database name

#### Security Configuration
- [ ] `JWT_SECRET` - Strong JWT secret key
- [ ] `NODE_ENV` - Set to "production"

#### AWS S3 Configuration (for video storage)
- [ ] `AWS_ACCESS_KEY_ID` - AWS access key
- [ ] `AWS_SECRET_ACCESS_KEY` - AWS secret key
- [ ] `AWS_S3_BUCKET` - S3 bucket name
- [ ] `AWS_REGION` - AWS region (e.g., us-east-1)
- [ ] `CLOUDFRONT_DOMAIN` - CloudFront domain (optional but recommended)

#### Mux Configuration (for video processing)
- [ ] `MUX_TOKEN_ID` - Mux token ID
- [ ] `MUX_TOKEN_SECRET` - Mux token secret
- [ ] `MUX_WEBHOOK_SECRET` - Mux webhook secret
- [ ] `MUX_SIGNING_KEY_ID` - Mux signing key ID (optional)
- [ ] `MUX_SIGNING_KEY_PRIVATE` - Mux signing key private key (optional)
- [ ] `MUX_ENVIRONMENT` - Set to "production"

#### Email Configuration
- [ ] `SMTP_HOST` - SMTP server host
- [ ] `SMTP_PORT` - SMTP server port
- [ ] `SMTP_USER` - SMTP username
- [ ] `SMTP_PASSWORD` - SMTP password
- [ ] `SMTP_FROM` - From email address

#### OAuth Configuration
- [ ] `GOOGLE_CLIENT_ID` - Google OAuth client ID
- [ ] `GOOGLE_CLIENT_SECRET` - Google OAuth client secret

#### Frontend Configuration
- [ ] `FRONTEND_URL` - Your frontend URL (e.g., https://your-app.vercel.app)
- [ ] `VERCEL_URL` - Vercel deployment URL (if using Vercel)

### 2. Database Setup
- [ ] PostgreSQL database created
- [ ] Database migrations run (`npm run migrate`)
- [ ] Initial seed data loaded (`npm run seed`)

### 3. Domain and SSL Configuration
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate installed
- [ ] DNS records properly configured

## Deployment Steps

### 1. Backend Deployment
1. [ ] Update `render.yaml` with correct frontend URL
2. [ ] Set all required environment variables in Render dashboard
3. [ ] Deploy backend service
4. [ ] Verify backend health check endpoint (`/api/health`)
5. [ ] Check logs for any errors

### 2. Frontend Deployment
1. [ ] Update frontend configuration to point to correct backend URL
2. [ ] Deploy frontend (Vercel, Netlify, or other platform)
3. [ ] Verify frontend loads correctly
4. [ ] Test API connectivity

### 3. Post-deployment Verification
1. [ ] Test user registration and login
2. [ ] Test course creation and management
3. [ ] Test video upload and playback
4. [ ] Test all major features
5. [ ] Verify admin panel access
6. [ ] Check email functionality
7. [ ] Test mobile responsiveness

## Troubleshooting Common Issues

### Slow Loading Times
1. Check database connection performance
2. Verify video processing is working correctly
3. Check CDN configuration for static assets
4. Review server logs for errors or warnings
5. Monitor resource usage (CPU, memory, disk)

### Feature Not Working
1. Check browser console for JavaScript errors
2. Verify API endpoints are returning correct responses
3. Check CORS configuration
4. Ensure all environment variables are properly set
5. Review server logs for specific error messages

### Video Processing Issues
1. Verify Mux credentials are correct
2. Check webhook configuration
3. Ensure videos are not too large or in unsupported formats
4. Review Mux dashboard for processing errors
5. Check AWS S3 configuration for backup storage

## Performance Optimization

### Database
- [ ] Enable database connection pooling
- [ ] Add database indexes for frequently queried fields
- [ ] Monitor slow queries and optimize them

### Caching
- [ ] Implement Redis caching for frequently accessed data
- [ ] Use CDN for static assets
- [ ] Enable browser caching for images and videos

### Video Optimization
- [ ] Use Mux for video processing and streaming
- [ ] Enable adaptive bitrate streaming
- [ ] Optimize video encoding settings

## Monitoring and Maintenance

### Health Checks
- [ ] Set up uptime monitoring
- [ ] Configure error tracking (Sentry, etc.)
- [ ] Monitor database performance
- [ ] Track API response times

### Regular Maintenance
- [ ] Regular database backups
- [ ] Update dependencies regularly
- [ ] Monitor disk space usage
- [ ] Review and rotate logs

## Support Resources

If you encounter issues:
1. Check the [README.md](README.md) for documentation
2. Review server logs in your deployment platform
3. Check the [GitHub Issues](https://github.com/your-repo/issues) for known issues
4. Contact support if needed