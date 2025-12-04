# Check AI Setup Script
# This script checks if the necessary Google Cloud APIs are enabled and permissions are set.

$PROJECT_ID = "eotconnect"
$SERVICE_NAME = "edu-platform-backend"
$REGION = "us-central1"

Write-Host "🔍 Checking AI Setup for Project: $PROJECT_ID" -ForegroundColor Cyan

# 1. Check if Vertex AI API is enabled
Write-Host "`n1. Checking Vertex AI API status..." -ForegroundColor Yellow
$apiStatus = gcloud services list --enabled --filter="config.name:aiplatform.googleapis.com" --project $PROJECT_ID --format="value(config.name)"

if ($apiStatus -eq "aiplatform.googleapis.com") {
    Write-Host "✅ Vertex AI API is ENABLED." -ForegroundColor Green
} else {
    Write-Host "❌ Vertex AI API is NOT ENABLED." -ForegroundColor Red
    Write-Host "   Enabling it now..."
    gcloud services enable aiplatform.googleapis.com --project $PROJECT_ID
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Enabled successfully." -ForegroundColor Green
    } else {
        Write-Host "   ❌ Failed to enable API. Please enable it manually in Google Cloud Console." -ForegroundColor Red
    }
}

# 2. Check Cloud Run Service Account
Write-Host "`n2. Checking Cloud Run Service Account..." -ForegroundColor Yellow
$serviceAccount = gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format="value(spec.template.spec.serviceAccountName)"

if (-not $serviceAccount) {
    # If not explicitly set, it uses the default compute service account
    $projectNumber = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
    $serviceAccount = "$projectNumber-compute@developer.gserviceaccount.com"
    Write-Host "   Using default Compute Engine Service Account: $serviceAccount" -ForegroundColor Gray
} else {
    Write-Host "   Service Account: $serviceAccount" -ForegroundColor Gray
}

# 3. Check Permissions (Vertex AI User)
Write-Host "`n3. Checking Permissions..." -ForegroundColor Yellow
Write-Host "   Granting 'Vertex AI User' role to the service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$serviceAccount" --role="roles/aiplatform.user"

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Permissions granted/verified." -ForegroundColor Green
} else {
    Write-Host "❌ Failed to grant permissions." -ForegroundColor Red
}

Write-Host "`n---------------------------------------------------"
Write-Host "🎉 Setup check complete!" -ForegroundColor Cyan
Write-Host "If you made changes, please wait 1-2 minutes and try the AI feature again."
