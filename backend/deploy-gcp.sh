#!/bin/bash

# Complete Google Cloud Platform Deployment Script
# This script sets up the entire infrastructure and deploys the application

set -e

echo "🚀 Complete EOTY Platform Deployment to Google Cloud"
echo "===================================================="

# Check prerequisites
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is required. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required. Install from: https://docs.docker.com/get-docker/"
    exit 1
fi

# Configuration
read -p "Enter your Google Cloud Project ID: " PROJECT_ID
read -p "Enter your preferred region (us-central1, europe-west1, etc.): " REGION
read -p "Enter your application name (eoty-platform): " APP_NAME

APP_NAME=${APP_NAME:-"eoty-platform"}

# Set project
echo "🔧 Setting up project $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔌 Enabling Google Cloud APIs..."
APIs=(
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "storage.googleapis.com"
    "aiplatform.googleapis.com"
    "secretmanager.googleapis.com"
    "monitoring.googleapis.com"
    "logging.googleapis.com"
    "cloudbuild.googleapis.com"
    "vpcaccess.googleapis.com"
)

for api in "${APIs[@]}"; do
    gcloud services enable $api
done

echo "✅ APIs enabled"

# Create service account
echo "👤 Creating service account..."
gcloud iam service-accounts create $APP_NAME-sa \
    --display-name="$APP_NAME Service Account" \
    --description="Service account for $APP_NAME"

SERVICE_ACCOUNT_EMAIL="$APP_NAME-sa@$PROJECT_ID.iam.gserviceaccount.com"

# Grant permissions
echo "🔑 Granting permissions..."
ROLES=(
    "roles/cloudsql.client"
    "roles/storage.objectAdmin"
    "roles/aiplatform.user"
    "roles/monitoring.metricWriter"
    "roles/logging.logWriter"
)

for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role"
done

# Create Cloud Storage buckets
echo "🪣 Creating Cloud Storage buckets..."
BUCKETS=(
    "gs://$APP_NAME-videos"
    "gs://$APP_NAME-documents"
    "gs://$APP_NAME-avatars"
    "gs://$APP_NAME-ai-content"
)

for bucket in "${BUCKETS[@]}"; do
    gsutil mb -p $PROJECT_ID $bucket
done

# Set CORS for public buckets
echo "🌐 Configuring CORS..."
cat > cors-config.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Authorization", "X-Requested-With"],
    "maxAgeSeconds": 3600
  }
]
EOF

for bucket in "${BUCKETS[@]}"; do
    gsutil cors set cors-config.json $bucket
done

# Create Cloud SQL PostgreSQL instance
echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create $APP_NAME-db \
    --database-version=POSTGRES_15 \
    --region=$REGION \
    --tier=db-f1-micro \
    --storage-size=20GB \
    --storage-type=HDD \
    --backup-start-time=02:00 \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=2 \
    --enable-point-in-time-recovery

# Create database
gcloud sql databases create $APP_NAME \
    --instance=$APP_NAME-db

# Generate random password for database user
DB_PASSWORD=$(openssl rand -base64 16)

# Create database user
echo "👤 Creating database user..."
gcloud sql users create $APP_NAME \
    --instance=$APP_NAME-db \
    --password="$DB_PASSWORD"

# Set up secrets in Secret Manager
echo "🔐 Setting up secrets..."
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=-
echo -n "your-jwt-secret-change-this-in-production" | gcloud secrets create jwt-secret --data-file=-
echo -n "your-google-oauth-client-id" | gcloud secrets create google-client-id --data-file=-
echo -n "your-google-oauth-client-secret" | gcloud secrets create google-client-secret --data-file=-
echo -n "your-sendgrid-api-key" | gcloud secrets create sendgrid-api-key --data-file=-
echo -n "your-mux-token-id" | gcloud secrets create mux-token-id --data-file=-
echo -n "your-mux-token-secret" | gcloud secrets create mux-token-secret --data-file=-

# Set up Vertex AI
echo "🤖 Setting up Vertex AI..."
gcloud ai models list --region=$REGION || echo "Vertex AI setup will be completed during deployment"

# Build and push Docker image
echo "🏗️ Building and pushing Docker image..."
IMAGE_NAME="gcr.io/$PROJECT_ID/$APP_NAME"
docker build -t $IMAGE_NAME .
gcloud auth configure-docker --quiet
docker push $IMAGE_NAME

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $APP_NAME \
    --image=$IMAGE_NAME \
    --platform=managed \
    --region=$REGION \
    --allow-unauthenticated \
    --port=8080 \
    --memory=2Gi \
    --cpu=1 \
    --max-instances=10 \
    --concurrency=80 \
    --timeout=900 \
    --service-account=$SERVICE_ACCOUNT_EMAIL \
    --set-env-vars="NODE_ENV=production" \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID" \
    --set-env-vars="GOOGLE_CLOUD_LOCATION=$REGION" \
    --set-env-vars="CLOUD_SQL_CONNECTION_NAME=$PROJECT_ID:$REGION:$APP_NAME-db" \
    --set-env-vars="GCS_VIDEO_BUCKET=$APP_NAME-videos" \
    --set-env-vars="GCS_DOCUMENT_BUCKET=$APP_NAME-documents" \
    --set-env-vars="GCS_AVATAR_BUCKET=$APP_NAME-avatars" \
    --set-env-vars="GCS_AI_BUCKET=$APP_NAME-ai-content" \
    --set-secrets="DB_PASSWORD=db-password:latest" \
    --set-secrets="JWT_SECRET=jwt-secret:latest" \
    --set-secrets="GOOGLE_CLIENT_ID=google-client-id:latest" \
    --set-secrets="GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
    --set-secrets="SENDGRID_API_KEY=sendgrid-api-key:latest" \
    --set-secrets="MUX_TOKEN_ID=mux-token-id:latest" \
    --set-secrets="MUX_TOKEN_SECRET=mux-token-secret:latest"

# Get service URL
SERVICE_URL=$(gcloud run services describe $APP_NAME --region=$REGION --format="value(status.url)")

# Create environment file for reference
cat > .env.gcp << EOF
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT=$PROJECT_ID
GOOGLE_CLOUD_LOCATION=$REGION
CLOUD_SQL_CONNECTION_NAME=$PROJECT_ID:$REGION:$APP_NAME-db

# Database
DB_HOST=/cloudsql/$PROJECT_ID:$REGION:$APP_NAME-db
DB_NAME=$APP_NAME
DB_USER=$APP_NAME
DB_PASSWORD=$DB_PASSWORD

# Storage
GCS_VIDEO_BUCKET=$APP_NAME-videos
GCS_DOCUMENT_BUCKET=$APP_NAME-documents
GCS_AVATAR_BUCKET=$APP_NAME-avatars
GCS_AI_BUCKET=$APP_NAME-ai-content

# Service URLs
BACKEND_URL=$SERVICE_URL
FRONTEND_URL=https://your-vercel-app.vercel.app

# JWT
JWT_SECRET=your-jwt-secret-change-this-in-production
JWT_EXPIRES_IN=24h

# OAuth
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Email
EMAIL_SERVICE_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@yourplatform.com

# Video Processing
MUX_TOKEN_ID=your-mux-token-id
MUX_TOKEN_SECRET=your-mux-token-secret

# AI Settings
NODE_ENV=production
USE_STREAMING=true
ENABLE_CACHING=true
MAX_CACHE_SIZE=100
AI_MAX_RETRIES=2
AI_CONCURRENT_REQUESTS=5
RETAIN_CONVERSATION_DATA=true
CONVERSATION_RETENTION_DAYS=30
ANONYMIZE_USER_DATA=false
EOF

echo "🎉 Deployment Complete!"
echo ""
echo "📋 Important Information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo "Service Account: $SERVICE_ACCOUNT_EMAIL"
echo "Database Instance: $APP_NAME-db"
echo "Backend URL: $SERVICE_URL"
echo ""
echo "🔐 Secrets to Update:"
echo "• Update JWT_SECRET in Secret Manager"
echo "• Add your Google OAuth credentials"
echo "• Add your SendGrid API key"
echo "• Add your Mux credentials"
echo ""
echo "📁 Storage Buckets Created:"
for bucket in "${BUCKETS[@]}"; do
    echo "• $bucket"
done
echo ""
echo "🗄️ Database Connection:"
echo "Host: /cloudsql/$PROJECT_ID:$REGION:$APP_NAME-db"
echo "Database: $APP_NAME"
echo "User: $APP_NAME"
echo ""
echo "🔧 Next Steps:"
echo "1. Update secrets in Google Secret Manager"
echo "2. Run database migrations: knex migrate:latest"
echo "3. Update Vercel frontend with new backend URL"
echo "4. Configure domain and SSL certificates"
echo "5. Set up monitoring and alerts"
echo ""
echo "📊 Useful Commands:"
echo "• gcloud run logs read $APP_NAME --region=$REGION"
echo "• gcloud sql connect $APP_NAME-db --user=$APP_NAME"
echo "• gcloud run services update-traffic $APP_NAME --to-latest --region=$REGION"
echo ""
echo "✅ Ready for production! 🚀"
