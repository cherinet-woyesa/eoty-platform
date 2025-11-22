#!/bin/bash

# Google Cloud Platform Setup Script for Educational Platform
# Run this script to set up the complete GCP infrastructure

set -e

echo "🚀 Setting up Google Cloud Platform for Educational Platform"
echo "=========================================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project details
read -p "Enter your Google Cloud Project ID: " PROJECT_ID
read -p "Enter your preferred region (us-central1, europe-west1, etc.): " REGION

# Set project
echo "🔧 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔌 Enabling required Google Cloud APIs..."
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable monitoring.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable cloudbuild.googleapis.com

echo "✅ APIs enabled successfully!"

# Create service account for Cloud Run
echo "👤 Creating service account..."
gcloud iam service-accounts create edu-platform-sa \
    --display-name="Educational Platform Service Account" \
    --description="Service account for educational platform backend"

# Grant necessary permissions
echo "🔑 Granting permissions to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:edu-platform-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:edu-platform-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:edu-platform-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

# Create Cloud Storage buckets
echo "🪣 Creating Cloud Storage buckets..."
gsutil mb -p $PROJECT_ID gs://edu-platform-videos/
gsutil mb -p $PROJECT_ID gs://edu-platform-documents/
gsutil mb -p $PROJECT_ID gs://edu-platform-avatars/

# Set CORS for storage buckets
echo "🌐 Configuring CORS for storage buckets..."
cat > cors-config.json << EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type", "Authorization"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors-config.json gs://edu-platform-videos/
gsutil cors set cors-config.json gs://edu-platform-documents/
gsutil cors set cors-config.json gs://edu-platform-avatars/

# Create Cloud SQL PostgreSQL instance
echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create edu-platform-db \
    --database-version=POSTGRES_15 \
    --region=$REGION \
    --tier=db-f1-micro \
    --storage-size=10GB \
    --storage-type=HDD \
    --backup-start-time=02:00 \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=2

# Create database user
echo "👤 Creating database user..."
gcloud sql users create edu_user \
    --instance=edu-platform-db \
    --password="$(openssl rand -base64 12)"

# Set up Vertex AI (basic setup)
echo "🤖 Setting up Vertex AI basic configuration..."
gcloud ai models list --region=$REGION || echo "Vertex AI setup will be completed during AI Assistant implementation"

# Create secrets in Secret Manager
echo "🔐 Setting up Secret Manager secrets..."
echo -n "your-jwt-secret-here" | gcloud secrets create jwt-secret --data-file=-
echo -n "your-google-oauth-client-id" | gcloud secrets create google-client-id --data-file=-
echo -n "your-google-oauth-client-secret" | gcloud secrets create google-client-secret --data-file=-
echo -n "your-sendgrid-api-key" | gcloud secrets create sendgrid-api-key --data-file=-
echo -n "your-mux-token-id" | gcloud secrets create mux-token-id --data-file=-
echo -n "your-mux-token-secret" | gcloud secrets create mux-token-secret --data-file=-

echo "🎉 Google Cloud infrastructure setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get your Cloud SQL instance connection details"
echo "2. Update your environment variables"
echo "3. Deploy your backend to Cloud Run"
echo "4. Update Vercel frontend configuration"
echo ""
echo "🔗 Useful commands:"
echo "   gcloud sql instances describe edu-platform-db"
echo "   gcloud run services list"
echo "   gcloud storage buckets list"
