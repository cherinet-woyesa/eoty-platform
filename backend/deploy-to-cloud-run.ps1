# PowerShell script to deploy to Google Cloud Run with Artifact Registry

$PROJECT_ID = "eotconnect"
$REGION = "us-central1"
$SERVICE_NAME = "edu-platform-backend"
$IMAGE_NAME = "us-central1-docker.pkg.dev/$PROJECT_ID/eoty-platform-repo/$SERVICE_NAME"

# Ensure we are in the script directory (backend)
Set-Location $PSScriptRoot

# Read .env for secrets (Using Env Vars for deployment to avoid IAM permission issues with Secrets)
$EnvPath = "$PSScriptRoot\.env"
if (Test-Path $EnvPath) {
    $EnvContent = Get-Content $EnvPath
    $EnvVars = @{}
    foreach ($line in $EnvContent) {
        if ($line -match "^([^#=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            $EnvVars[$name] = $value
        }
    }
} else {
    Write-Error ".env file not found! Cannot deploy without configuration."
    exit 1
}

Write-Host "Deploying Educational Platform Backend to Cloud Run"
Write-Host "======================================================"

# Build and push Docker image to Artifact Registry
Write-Host "Building and pushing Docker image..."
gcloud builds submit --tag $IMAGE_NAME .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker build failed"
    exit 1
}

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME `
    --image $IMAGE_NAME `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --port 5000 `
    --memory 2Gi `
    --cpu 1 `
    --max-instances 10 `
    --concurrency 80 `
    --timeout 900 `
    --add-cloudsql-instances "${PROJECT_ID}:${REGION}:eoty-platform-db" `
    --set-env-vars "NODE_ENV=production" `
    --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID" `
    --set-env-vars "GOOGLE_CLOUD_LOCATION=$REGION" `
    --set-env-vars "CLOUD_SQL_CONNECTION_NAME=${PROJECT_ID}:${REGION}:eoty-platform-db" `
    --set-env-vars "GCS_VIDEO_BUCKET=eoty-platform-videos" `
    --set-env-vars "GCS_DOCUMENT_BUCKET=eoty-platform-documents" `
    --set-env-vars "GCS_AVATAR_BUCKET=eoty-platform-avatars" `
    --set-env-vars "GCS_AI_BUCKET=eoty-platform-ai-content" `
    --set-env-vars "DB_HOST=/cloudsql/${PROJECT_ID}:${REGION}:eoty-platform-db" `
    --set-env-vars "DB_NAME=eoty-platform" `
    --set-env-vars "DB_USER=eoty-platform" `
    --set-env-vars "FRONTEND_URL=https://your-vercel-app.vercel.app" `
    --set-env-vars "API_BASE_URL=https://your-api-url" `
    --set-env-vars "JWT_SECRET=$($EnvVars['JWT_SECRET'])" `
    --set-env-vars "SENDGRID_API_KEY=$($EnvVars['EMAIL_SERVICE_API_KEY'])" `
    --set-env-vars "MUX_TOKEN_ID=$($EnvVars['MUX_TOKEN_ID'])" `
    --set-env-vars "MUX_TOKEN_SECRET=$($EnvVars['MUX_TOKEN_SECRET'])" `
    --set-env-vars "AWS_ACCESS_KEY_ID=$($EnvVars['AWS_ACCESS_KEY_ID'])" `
    --set-env-vars "AWS_SECRET_ACCESS_KEY=$($EnvVars['AWS_SECRET_ACCESS_KEY'])" `
    --set-env-vars "AWS_S3_BUCKET=$($EnvVars['AWS_S3_BUCKET'])" `
    --set-env-vars "AWS_REGION=$($EnvVars['AWS_REGION'])" `
    --set-env-vars "DB_PASSWORD=$($EnvVars['DB_PASSWORD'])" `
    --set-env-vars "PGSSLMODE=disable"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Cloud Run deployment failed"
    exit 1
}

# Get the service URL
$SERVICE_URL = gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)"

Write-Host "Deployment complete!"
Write-Host "Service URL: $SERVICE_URL"
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Update your Vercel frontend with the new backend URL: $SERVICE_URL"
Write-Host "2. Run database migrations on the deployed service"
Write-Host "3. Test the API endpoints"
Write-Host "4. Set up monitoring and alerting"
