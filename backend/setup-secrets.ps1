$ErrorActionPreference = "Continue"

# Configuration
$PROJECT_ID = "eotconnect"
$SERVICE_ACCOUNT = "eoty-ai-service@$PROJECT_ID.iam.gserviceaccount.com"

Write-Host "Setting up Secrets..." -ForegroundColor Cyan

# Grant Secret Accessor Role
Write-Host "Granting Secret Accessor role..."
cmd /c "gcloud projects add-iam-policy-binding $PROJECT_ID --member=serviceAccount:$SERVICE_ACCOUNT --role=roles/secretmanager.secretAccessor"
Write-Host "Permissions updated." -ForegroundColor Green

# Function to create or update a secret
function Set-GcpSecret {
    param (
        [string]$SecretName,
        [string]$SecretValue
    )
    
    if ([string]::IsNullOrWhiteSpace($SecretValue)) {
        Write-Warning "Skipping $SecretName (Value is empty)"
        return
    }

    Write-Host "Configuring $SecretName..."
    
    # Try to create (ignore error if exists)
    cmd /c "gcloud secrets create $SecretName --replication-policy=automatic --project=$PROJECT_ID 2>NUL"

    # Add version
    $SecretValue | cmd /c "gcloud secrets versions add $SecretName --data-file=- --project=$PROJECT_ID"
}

# Read .env file
$EnvPath = "$PSScriptRoot\.env"
if (-not (Test-Path $EnvPath)) {
    Write-Error ".env file not found at $EnvPath"
    exit 1
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

Write-Host "Secrets setup complete." -ForegroundColor Cyan
