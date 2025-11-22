# 🚀 EOTY Platform - Google Cloud Migration Guide

## Overview

This guide will help you migrate your educational platform from local development/Vercel+Render to Google Cloud Platform for enterprise-grade scalability and performance.

## 📋 Prerequisites

### 1. Google Cloud Account Setup
1. Create a Google Cloud account at [cloud.google.com](https://cloud.google.com)
2. Enable billing for your account
3. Install Google Cloud SDK:
   ```bash
   # Install gcloud CLI
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL

   # Initialize
   gcloud init
   ```

### 2. Required Permissions
- Google Cloud Project Owner or Editor role
- Billing account access
- Domain ownership (for custom domains)

---

## 🏗️ Phase 1: Infrastructure Setup

### Step 1: Run the Automated Setup Script

```bash
# Navigate to backend directory
cd backend

# Make scripts executable
chmod +x gcp-deployment-setup.sh
chmod +x deploy-gcp.sh

# Run the setup script
./gcp-deployment-setup.sh
```

This script will:
- ✅ Create Google Cloud project and enable APIs
- ✅ Set up service accounts and permissions
- ✅ Create Cloud Storage buckets
- ✅ Configure basic security settings

### Step 2: Manual Configuration

#### Update Secrets in Google Secret Manager
```bash
# Update JWT secret (generate a strong one)
echo -n "your-super-secure-jwt-secret-here" | gcloud secrets versions add jwt-secret --data-file=-

# Add Google OAuth credentials
echo -n "your-google-client-id" | gcloud secrets versions add google-client-id --data-file=-
echo -n "your-google-client-secret" | gcloud secrets versions add google-client-secret --data-file=-

# Add SendGrid API key
echo -n "your-sendgrid-api-key" | gcloud secrets versions add sendgrid-api-key --data-file=-

# Add Mux credentials (for video processing)
echo -n "your-mux-token-id" | gcloud secrets versions add mux-token-id --data-file=-
echo -n "your-mux-token-secret" | gcloud secrets versions add mux-token-secret --data-file=-
```

#### Configure Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to "APIs & Services" → "Credentials"
3. Create OAuth 2.0 Client ID
4. Add authorized origins:
   - `https://your-vercel-app.vercel.app`
   - `https://your-production-domain.com`
5. Add authorized redirect URIs:
   - `https://your-vercel-app.vercel.app/auth/google/callback`
   - `https://your-production-domain.com/auth/google/callback`

---

## 🗄️ Phase 2: Database Migration

### Step 1: Run Database Migrations

```bash
# Get Cloud SQL connection details
gcloud sql instances describe your-app-name-db --format="value(connectionName)"

# Connect to database
gcloud sql connect your-app-name-db --user=your-app-name

# Run migrations (from your local machine initially)
cd backend
npm run migrate:latest

# Seed initial data
npm run seed:run
```

### Step 2: Migrate Existing Data (if applicable)

If you have existing data from Render/PostgreSQL:

```bash
# Export data from old database
pg_dump -h old-host -U old-user -d old-database > backup.sql

# Import to Cloud SQL
gcloud sql import sql your-app-name-db backup.sql --database=your-app-name
```

---

## 🤖 Phase 3: AI Assistant Setup

### Step 1: Enable Vertex AI

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Set up Vertex AI location
gcloud ai models list --region=us-central1
```

### Step 2: Fine-tune Model (Optional)

For custom Ethiopian Orthodox content:

```bash
# Create a custom model (requires training data)
gcloud ai custom-jobs create \
    --region=us-central1 \
    --display-name=eoty-faith-model \
    --python-package-uris=gs://your-bucket/training-code.tar.gz \
    --python-module=trainer.task \
    --package-path=./trainer \
    --machine-type=n1-standard-4 \
    --replica-count=1 \
    --args=--input-path=gs://your-bucket/training-data.csv,--output-path=gs://your-bucket/model-output
```

### Step 3: Update AI Configuration

The new AI service (`aiService-gcp.js`) is already configured for:
- ✅ Vertex AI integration
- ✅ Ethiopian Orthodox faith alignment
- ✅ Multi-language support (Amharic, English)
- ✅ Context-aware responses
- ✅ Performance monitoring (<3s response time)

---

## 🚀 Phase 4: Deployment

### Step 1: Build and Deploy

```bash
# Run the deployment script
./deploy-gcp.sh
```

This will:
- ✅ Build Docker image
- ✅ Push to Google Container Registry
- ✅ Deploy to Cloud Run
- ✅ Configure environment variables
- ✅ Set up secrets access

### Step 2: Verify Deployment

```bash
# Check service status
gcloud run services describe your-app-name --region=us-central1

# View logs
gcloud run logs read your-app-name --region=us-central1

# Test health endpoint
curl https://your-service-url/health
```

---

## 🎨 Phase 5: Frontend Migration

### Step 1: Update Vercel Configuration

Create/update `vercel.json`:

```json
{
  "env": {
    "VITE_API_URL": "https://your-cloud-run-service-url",
    "VITE_GOOGLE_CLIENT_ID": "your-google-client-id"
  },
  "build": {
    "env": {
      "VITE_API_URL": "https://your-cloud-run-service-url",
      "VITE_GOOGLE_CLIENT_ID": "your-google-client-id"
    }
  }
}
```

### Step 2: Update Environment Variables

In Vercel dashboard:
- `VITE_API_URL`: Your Cloud Run service URL
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID
- `VITE_ENVIRONMENT`: "production"

### Step 3: Deploy Frontend

```bash
# Deploy to Vercel (from frontend directory)
cd ../frontend
vercel --prod
```

---

## 📊 Phase 6: Monitoring & Optimization

### Step 1: Set Up Monitoring

```bash
# Enable Cloud Monitoring
gcloud services enable monitoring.googleapis.com

# Create alerting policies
gcloud alpha monitoring policies create \
    --policy-from-file=alert-policy.json
```

### Step 2: Performance Optimization

```bash
# Enable Cloud CDN for static assets
gcloud compute backend-buckets create eoty-assets \
    --gcs-bucket-name=your-app-name-assets

# Set up load balancer (if needed)
gcloud compute url-maps create eoty-lb \
    --default-backend-bucket=eoty-assets
```

### Step 3: Cost Optimization

```bash
# Set up budget alerts
gcloud billing budgets create eoty-budget \
    --billing-account=your-billing-account \
    --amount=500 \
    --threshold-rule=percent=50 \
    --threshold-rule=percent=90
```

---

## 🧪 Phase 7: Testing & Validation

### Functional Tests

```bash
# Test AI responses
curl -X POST https://your-service-url/api/ai/ask \
  -H "Content-Type: application/json" \
  -d '{"question":"What is Tewahedo?","context":{}}'

# Test authentication
curl -X POST https://your-service-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'

# Test file uploads
curl -X POST https://your-service-url/api/admin/uploads \
  -F "file=@test.pdf"
```

### Performance Tests

```bash
# Load testing with Apache Bench
ab -n 1000 -c 10 https://your-service-url/health

# AI response time testing
# Use tools like Artillery or k6 for comprehensive testing
```

---

## 🚨 Troubleshooting

### Common Issues

#### 1. Cloud SQL Connection Issues
```bash
# Check connection
gcloud sql instances describe your-app-name-db

# Restart instance if needed
gcloud sql instances restart your-app-name-db
```

#### 2. Vertex AI Errors
```bash
# Check Vertex AI status
gcloud ai models list --region=us-central1

# Check quotas
gcloud ai locations describe us-central1 --format="value(quota)"
```

#### 3. Permission Errors
```bash
# Check service account permissions
gcloud iam service-accounts get-iam-policy your-app-name-sa@your-project.iam.gserviceaccount.com

# Add missing permissions
gcloud projects add-iam-policy-binding your-project \
    --member="serviceAccount:your-app-name-sa@your-project.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
```

---

## 📈 Scaling & Maintenance

### Auto-scaling Configuration

```bash
# Update Cloud Run service for higher limits
gcloud run services update your-app-name \
    --max-instances=50 \
    --concurrency=100 \
    --cpu=2 \
    --memory=4Gi \
    --region=us-central1
```

### Backup Strategy

```bash
# Automated backups are enabled by default
# Manual backup
gcloud sql backups create your-app-name-db-backup \
    --instance=your-app-name-db \
    --description="Manual backup"
```

### Cost Monitoring

```bash
# View current costs
gcloud billing accounts list
gcloud billing export create \
    --name=eoty-billing-export \
    --destination-table-name=billing_export \
    --dataset=eoty-analytics
```

---

## 🎯 Success Metrics

After migration, monitor these KPIs:

- **Performance**: <2s page load, <3s AI responses
- **Availability**: >99.95% uptime
- **Scalability**: Handle 10,000+ concurrent users
- **Cost**: <$500/month for moderate usage
- **User Experience**: 95%+ satisfaction scores

---

## 📞 Support & Resources

### Google Cloud Resources
- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Cloud SQL Documentation](https://cloud.google.com/sql/docs)

### Community Support
- [Google Cloud Community](https://cloud.google.com/community)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-cloud-platform)

### Enterprise Support
- [Google Cloud Support](https://cloud.google.com/support)
- [Paid support plans available](https://cloud.google.com/support/plans)

---

## ✅ Migration Checklist

- [ ] Google Cloud project created
- [ ] APIs enabled
- [ ] Service accounts configured
- [ ] Cloud Storage buckets created
- [ ] Cloud SQL database provisioned
- [ ] Secrets configured
- [ ] Vertex AI enabled
- [ ] Docker image built and deployed
- [ ] Backend deployed to Cloud Run
- [ ] Database migrations completed
- [ ] Frontend updated and deployed
- [ ] Domain configured (optional)
- [ ] SSL certificates configured
- [ ] Monitoring and alerting set up
- [ ] Load testing completed
- [ ] Performance benchmarks met
- [ ] Documentation updated

---

**🎉 Congratulations! Your platform is now running on enterprise-grade infrastructure.**

For questions or issues during migration, refer to this guide or create an issue in the repository.
