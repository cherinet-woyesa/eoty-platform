# PowerShell script to update .env file for GCP deployment

# Read current .env file
$content = Get-Content -Path ".env" -Raw

# Update database configuration for GCP
$content = $content -replace "(?m)^DB_HOST=.*$", "DB_HOST=/cloudsql/eotconnect:us-central1:eoty-platform-db"
$content = $content -replace "(?m)^DB_NAME=.*$", "DB_NAME=eoty-platform"
$content = $content -replace "(?m)^DB_USER=.*$", "DB_USER=eoty-platform"

# Add GCP-specific variables at the top
$gcpConfig = @"
# Google Cloud Platform Environment Configuration
GOOGLE_CLOUD_PROJECT=eotconnect
GOOGLE_CLOUD_LOCATION=us-central1
CLOUD_SQL_CONNECTION_NAME=eotconnect:us-central1:eoty-platform-db

# Storage Buckets (Google Cloud Storage)
GCS_VIDEO_BUCKET=eoty-platform-videos
GCS_DOCUMENT_BUCKET=eoty-platform-documents
GCS_AVATAR_BUCKET=eoty-platform-avatars
GCS_AI_BUCKET=eoty-platform-ai-content

"@

# Add GCP config at the beginning
$content = $gcpConfig + $content

# Update environment settings
$content = $content -replace "(?m)^NODE_ENV=.*$", "NODE_ENV=production"
$content = $content -replace "(?m)^MUX_ENVIRONMENT=.*$", "MUX_ENVIRONMENT=production"

# Add production-specific variables if not present
if ($content -notmatch "FRONTEND_URL=") {
    $content += "`nFRONTEND_URL=https://your-vercel-app.vercel.app`n"
    $content += "CORS_ORIGIN=https://your-vercel-app.vercel.app`n"
}

if ($content -notmatch "ENABLE_HTTPS=") {
    $content += "`nENABLE_HTTPS=true`n"
    $content += "ENABLE_PROMETHEUS_METRICS=true`n"
    $content += "LOG_LEVEL=info`n"
}

# Write back to .env file
$content | Set-Content -Path ".env"

Write-Host "✅ .env file updated for GCP deployment!"
Write-Host "📝 Remember to:"
Write-Host "   1. Update FRONTEND_URL with your actual Vercel URL"
Write-Host "   2. Update DB_PASSWORD with the Cloud SQL password"
Write-Host "   3. Update SESSION_SECRET with a secure random string"
"
