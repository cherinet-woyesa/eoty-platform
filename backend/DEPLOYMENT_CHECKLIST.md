# 🚀 EOTY Platform - Deployment Readiness Checklist

## ✅ COMPLETED COMPONENTS

### Infrastructure Setup
- [x] Google Cloud project created (`eoty-platform`)
- [x] Google Cloud SDK installed and configured
- [x] Authentication completed (`woyesabizunesh@gmail.com`)
- [x] Region configured (`us-central1`)

### Code Updates
- [x] AI Assistant migrated to Vertex AI
- [x] Multi-language support (Amharic, English, Ge'ez)
- [x] Context-aware AI responses
- [x] Google Cloud Storage integration
- [x] Google Cloud SQL configuration
- [x] Docker configuration updated
- [x] Environment variables configured

### Deployment Scripts
- [x] Google Cloud setup script created
- [x] Cloud Run deployment script created
- [x] Database migration scripts ready
- [x] Environment templates created

---

## 🔄 PRE-DEPLOYMENT CHECKLIST (Complete Before Billing)

### 1. Credentials & API Keys Preparation

#### Google OAuth Setup
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Navigate to "APIs & Services" → "Credentials"
- [ ] Create "OAuth 2.0 Client ID"
- [ ] Set authorized origins:
  - `https://your-vercel-app.vercel.app`
  - `https://eoty-platform.vercel.app` (if using this domain)
- [ ] Set redirect URIs:
  - `https://your-vercel-app.vercel.app/auth/google/callback`
  - `https://eoty-platform.vercel.app/auth/google/callback`
- [ ] **SAVE:** Client ID and Client Secret

#### SendGrid Email Setup
- [ ] Go to [SendGrid Dashboard](https://app.sendgrid.com)
- [ ] Create API Key with "Full Access" permissions
- [ ] Verify sender email (`noreply@yourplatform.com`)
- [ ] **SAVE:** API Key

#### Mux Video Processing (Optional)
- [ ] Go to [Mux Dashboard](https://dashboard.mux.com)
- [ ] Create new access token
- [ ] **SAVE:** Token ID and Token Secret

### 2. Environment Variables Preparation

Create `.env.production` file with all required variables:

```bash
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=eoty-platform
GOOGLE_CLOUD_LOCATION=us-central1
CLOUD_SQL_CONNECTION_NAME=eoty-platform:us-central1:eoty-platform-db

# Database
DB_HOST=/cloudsql/eoty-platform:us-central1:eoty-platform-db
DB_NAME=eoty-platform
DB_USER=eoty-platform
# DB_PASSWORD will be set via Secret Manager

# Storage
GCS_VIDEO_BUCKET=eoty-platform-videos
GCS_DOCUMENT_BUCKET=eoty-platform-documents
GCS_AVATAR_BUCKET=eoty-platform-avatars
GCS_AI_BUCKET=eoty-platform-ai-content

# Frontend
FRONTEND_URL=https://your-vercel-app.vercel.app
CORS_ORIGIN=https://your-vercel-app.vercel.app

# Authentication
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=24h

# OAuth
GOOGLE_CLIENT_ID=your-actual-google-client-id
GOOGLE_CLIENT_SECRET=your-actual-google-client-secret

# Email
EMAIL_SERVICE_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourplatform.com

# Video Processing
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret

# Application Settings
NODE_ENV=production
USE_STREAMING=true
ENABLE_CACHING=true
MAX_CACHE_SIZE=100
AI_MAX_RETRIES=2
AI_CONCURRENT_REQUESTS=5
RETAIN_CONVERSATION_DATA=true
CONVERSATION_RETENTION_DAYS=30
ANONYMIZE_USER_DATA=false

# Performance
MAX_FILE_SIZE_MB=100
UPLOAD_TIMEOUT_MS=300000
AI_RESPONSE_TIMEOUT_MS=3000
```

### 3. Vercel Frontend Configuration

Update `vercel.json` in frontend directory:

```json
{
  "env": {
    "VITE_API_URL": "https://eoty-platform-service-url",
    "VITE_GOOGLE_CLIENT_ID": "your-google-client-id"
  },
  "build": {
    "env": {
      "VITE_API_URL": "https://eoty-platform-service-url",
      "VITE_GOOGLE_CLIENT_ID": "your-google-client-id"
    }
  },
  "functions": {
    "src/pages/api/**/*.js": {
      "maxDuration": 30
    }
  }
}
```

### 4. Local Testing Verification

- [ ] Test AI Assistant locally with Vertex AI
- [ ] Verify file uploads work with local storage
- [ ] Test authentication flow
- [ ] Check database connections
- [ ] Verify email sending (if configured)
- [ ] Test API endpoints

### 5. Docker Image Preparation

- [ ] Ensure Dockerfile is optimized for production
- [ ] Test Docker build locally:
  ```bash
  docker build -t eoty-platform-test .
  docker run -p 8080:8080 eoty-platform-test
  ```
- [ ] Verify health endpoint works in container

---

## 🚀 IMMEDIATE POST-BILLING TASKS

### Phase 1: Infrastructure Setup (5-10 minutes)

```bash
# Enable APIs
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable secretmanager.googleapis.com

# Create storage buckets
gsutil mb -p eoty-platform gs://eoty-platform-videos/
gsutil mb -p eoty-platform gs://eoty-platform-documents/
gsutil mb -p eoty-platform gs://eoty-platform-avatars/
gsutil mb -p eoty-platform gs://eoty-platform-ai-content/
```

### Phase 2: Database Setup (10-15 minutes)

```bash
# Create Cloud SQL instance
gcloud sql instances create eoty-platform-db \
  --database-version=POSTGRES_15 \
  --region=us-central1 \
  --tier=db-f1-micro \
  --storage-size=20GB

# Create database and user
gcloud sql databases create eoty-platform --instance=eoty-platform-db
gcloud sql users create eoty-platform --instance=eoty-platform-db --password="generated-password"
```

### Phase 3: Secrets Configuration (2-3 minutes)

```bash
# Upload all secrets to Secret Manager
echo "jwt-secret-here" | gcloud secrets create jwt-secret --data-file=-
echo "google-client-id" | gcloud secrets create google-client-id --data-file=-
echo "google-client-secret" | gcloud secrets create google-client-secret --data-file=-
echo "sendgrid-api-key" | gcloud secrets create sendgrid-api-key --data-file=-
```

### Phase 4: Deployment (5-7 minutes)

```bash
# Build and push Docker image
docker build -t gcr.io/eoty-platform/eoty-platform .
gcloud auth configure-docker --quiet
docker push gcr.io/eoty-platform/eoty-platform

# Deploy to Cloud Run
gcloud run deploy eoty-platform \
  --image gcr.io/eoty-platform/eoty-platform \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 1 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 900 \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "DB_PASSWORD=db-password:latest" \
  --set-secrets "JWT_SECRET=jwt-secret:latest" \
  --set-secrets "GOOGLE_CLIENT_ID=google-client-id:latest" \
  --set-secrets "GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
  --set-secrets "SENDGRID_API_KEY=sendgrid-api-key:latest"
```

### Phase 5: Database Migration (2-3 minutes)

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe eoty-platform --region=us-central1 --format="value(status.url)")

# Run migrations (you'll need to connect to the database)
gcloud sql connect eoty-platform-db --user=eoty-platform
# Then run: knex migrate:latest --env google_cloud
```

### Phase 6: Frontend Update (1-2 minutes)

```bash
# Update Vercel environment variables
vercel env add VITE_API_URL
# Enter: https://your-service-url

vercel env add VITE_GOOGLE_CLIENT_ID
# Enter: your-google-client-id

# Redeploy frontend
vercel --prod
```

---

## 🔍 VERIFICATION CHECKLIST

After deployment:

- [ ] Health endpoint works: `curl https://service-url/health`
- [ ] AI endpoint responds: `curl https://service-url/api/ai/ask -d '{"question":"Hello","context":{}}'`
- [ ] Authentication works
- [ ] File uploads work
- [ ] Frontend connects to backend
- [ ] Emails send (if configured)

---

## 🚨 CRITICAL SUCCESS FACTORS

### Must-Have Before Deployment:
1. **All API keys and credentials ready** (Google OAuth, SendGrid)
2. **Environment variables prepared** (`.env.production` file)
3. **Vercel configuration updated**
4. **Local testing completed**
5. **Docker image tested**

### Time Estimate:
- **Preparation:** 30-60 minutes (what we're doing now)
- **Post-billing deployment:** 30-45 minutes
- **Testing & verification:** 15-30 minutes

---

## 💰 COST MONITORING SETUP

After deployment, set up cost alerts:

```bash
# Create billing budget
gcloud billing budgets create eoty-budget \
  --billing-account=YOUR_BILLING_ACCOUNT \
  --amount=100 \
  --threshold-rule=percent=50 \
  --threshold-rule=percent=90
```

---

## 📞 SUPPORT CONTACTS

- **Google Cloud Support:** https://cloud.google.com/support
- **Vercel Support:** https://vercel.com/support
- **SendGrid Support:** https://support.sendgrid.com

---

**Status:** All components prepared ✅ | Ready for billing activation 🚀</contents>
</xai:function_call">Create deployment readiness checklist
