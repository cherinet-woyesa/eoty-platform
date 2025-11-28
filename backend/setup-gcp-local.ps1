# backend/setup-gcp-local.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔧 Setting up GCP Environment for Local Development..." -ForegroundColor Cyan

# Determine paths
if ($PSScriptRoot) {
    $BackendDir = $PSScriptRoot
} else {
    $BackendDir = Join-Path (Get-Location) "backend"
}

$EnvFile = Join-Path $BackendDir ".env"
$KeyFile = Join-Path $BackendDir "gcp-key.json"

Write-Host "   Target .env: $EnvFile" -ForegroundColor Gray
Write-Host "   Target Key:  $KeyFile" -ForegroundColor Gray

# 1. Check for gcp-key.json
if (-not (Test-Path $KeyFile)) {
    Write-Error "❌ gcp-key.json not found at $KeyFile. Please place your service account key there."
}
Write-Host "✅ Found gcp-key.json" -ForegroundColor Green

# 2. Update .env file
if (-not (Test-Path $EnvFile)) {
    Write-Host "⚠️  .env file not found. Creating from template..." -ForegroundColor Yellow
    $TemplateFile = Join-Path $BackendDir "gcp-env-template.txt"
    if (Test-Path $TemplateFile) {
        Copy-Item $TemplateFile $EnvFile
    } else {
        New-Item -Path $EnvFile -ItemType File | Out-Null
    }
}

$EnvContent = Get-Content $EnvFile -Raw
if ($null -eq $EnvContent) { $EnvContent = "" }
$UpdatesMade = $false

Write-Host "📝 Updating .env configuration..." -ForegroundColor Cyan

# Update GOOGLE_CLOUD_PROJECT
if ($EnvContent -match "GOOGLE_CLOUD_PROJECT=") {
    if ($EnvContent -match "GOOGLE_CLOUD_PROJECT=your-project-id" -or $EnvContent -match "GOOGLE_CLOUD_PROJECT=$") {
        $EnvContent = $EnvContent -replace "GOOGLE_CLOUD_PROJECT=.*", "GOOGLE_CLOUD_PROJECT=eotconnect"
        $UpdatesMade = $true
        Write-Host "   Updated GOOGLE_CLOUD_PROJECT" -ForegroundColor Gray
    }
} else {
    $EnvContent += "`nGOOGLE_CLOUD_PROJECT=eotconnect"
    $UpdatesMade = $true
    Write-Host "   Added GOOGLE_CLOUD_PROJECT" -ForegroundColor Gray
}

# Update GOOGLE_APPLICATION_CREDENTIALS
if ($EnvContent -notmatch "GOOGLE_APPLICATION_CREDENTIALS") {
    $EnvContent += "`nGOOGLE_APPLICATION_CREDENTIALS=$KeyFile"
    $UpdatesMade = $true
    Write-Host "   Added GOOGLE_APPLICATION_CREDENTIALS" -ForegroundColor Gray
}

if ($UpdatesMade) {
    Set-Content -Path $EnvFile -Value $EnvContent
    Write-Host "✅ .env updated." -ForegroundColor Green
} else {
    Write-Host "   .env already configured." -ForegroundColor Gray
}

Write-Host "`n🚀 Environment ready!" -ForegroundColor Cyan
Write-Host "To verify connection, run:" -ForegroundColor White
Write-Host "node backend/test-gcp-connection.js" -ForegroundColor Yellow
