#!/bin/bash

# Deploy Backend to Google Cloud Run
# This script builds and deploys the backend to Cloud Run

set -e

echo "🚀 Deploying Educational Platform Backend to Cloud Run"
echo "======================================================"

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="edu-platform-backend"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

# Build and push Docker image
echo "🏗️ Building and pushing Docker image..."
gcloud builds submit --tag $IMAGE_NAME .

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 2Gi \
    --cpu 1 \
    --max-instances 10 \
    --concurrency 80 \
    --timeout 900 \
    --service-account "edu-platform-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --set-env-vars "NODE_ENV=production" \
    --set-secrets "JWT_SECRET=jwt-secret:latest" \
    --set-secrets "GOOGLE_CLIENT_ID=google-client-id:latest" \
    --set-secrets "GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
    --set-secrets "SENDGRID_API_KEY=sendgrid-api-key:latest" \
    --set-secrets "MUX_TOKEN_ID=mux-token-id:latest" \
    --set-secrets "MUX_TOKEN_SECRET=mux-token-secret:latest"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo "✅ Deployment complete!"
echo "🌐 Service URL: $SERVICE_URL"
echo ""
echo "📋 Next steps:"
echo "1. Update your Vercel frontend with the new backend URL"
echo "2. Test the deployment"
echo "3. Set up monitoring and alerts"
echo ""
echo "🔗 Useful commands:"
echo "   gcloud run services logs read $SERVICE_NAME --region=$REGION"
echo "   gcloud run services update-traffic $SERVICE_NAME --to-latest --region=$REGION"
