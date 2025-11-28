$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_ID = "eotconnect"
$REGION = "us-central1"
$REPO_NAME = "eoty-platform-repo"
$SERVICE_ACCOUNT = "eoty-ai-service@$PROJECT_ID.iam.gserviceaccount.com"

Write-Host "Preparing GCP Project for Deployment..." -ForegroundColor Cyan

# 1. Enable Required APIs
Write-Host "Enabling required Google Cloud APIs..."
gcloud services enable artifactregistry.googleapis.com run.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com sqladmin.googleapis.com
Write-Host "APIs enabled." -ForegroundColor Green

# 2. Create Artifact Registry Repository
Write-Host "Checking Artifact Registry repository..."
$RepoExists = gcloud artifacts repositories describe $REPO_NAME --location=$REGION --project=$PROJECT_ID 2>$null
if (-not $RepoExists) {
    Write-Host "   Creating repository $REPO_NAME..."
    gcloud artifacts repositories create $REPO_NAME --repository-format=docker --location=$REGION --description="EOTY Platform Docker Repository"
    Write-Host "Repository created." -ForegroundColor Green
} else {
    Write-Host "Repository $REPO_NAME already exists." -ForegroundColor Green
}

# 3. Grant Secret Accessor Role to Service Account
Write-Host "Granting Secret Accessor role to service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/secretmanager.secretAccessor" | Out-Null
Write-Host "Service account permissions updated." -ForegroundColor Green

# 4. Create Secrets from .env
Write-Host "Creating/Updating Secrets from .env..."

# Function to create or update a secret
function Set-GcpSecret {
    param (
        [string]$SecretName,
        [string]$SecretValue
    )
    
    if ([string]::IsNullOrWhiteSpace($SecretValue)) {
        Write-Warning "   Skipping $SecretName (Value is empty)"
        return
    }

    # Check if secret exists
    $SecretExists = gcloud secrets describe $SecretName --project=$PROJECT_ID 2>$null
    
    if (-not $SecretExists) {
        Write-Host "   Creating secret $SecretName..."
        gcloud secrets create $SecretName --replication-policy="automatic" --project=$PROJECT_ID | Out-Null
    }

    # Add new version
    Write-Host "   Adding value to $SecretName..."
    $SecretValue | gcloud secrets versions add $SecretName --data-file=- --project=$PROJECT_ID | Out-Null
}

# Read .env file
$EnvPath = "$PSScriptRoot\.env"
if (-not (Test-Path $EnvPath)) {
    Write-Error ".env file not found at $EnvPath"
}

$EnvContent = Get-Content $EnvPath
$EnvVars = @{}
foreach ($line in $EnvContent) {
    if ($line -match "^([^#=]+)=(.*)$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        $EnvVars[$name] = $value
    }
}

# Map .env vars to Secret names
Set-GcpSecret -SecretName "jwt-secret" -SecretValue $EnvVars["JWT_SECRET"]
Set-GcpSecret -SecretName "sendgrid-api-key" -SecretValue $EnvVars["EMAIL_SERVICE_API_KEY"]
Set-GcpSecret -SecretName "mux-token-id" -SecretValue $EnvVars["MUX_TOKEN_ID"]
Set-GcpSecret -SecretName "mux-token-secret" -SecretValue $EnvVars["MUX_TOKEN_SECRET"]
Set-GcpSecret -SecretName "db-password" -SecretValue $EnvVars["DB_PASSWORD"]

Write-Host "Secrets configured." -ForegroundColor Green
Write-Host "`nPreparation complete! You can now run deploy-to-cloud-run.ps1" -ForegroundColor Cyan
