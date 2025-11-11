# Vercel Deployment Script
# Run this script to deploy to Vercel production

Write-Host "🚀 Starting Vercel deployment..." -ForegroundColor Cyan

# Check if Vercel CLI is installed
$vercelVersion = vercel --version 2>$null
if (-not $vercelVersion) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel@latest
}

# Deploy to production
Write-Host "📦 Deploying to Vercel production..." -ForegroundColor Yellow
vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Deployment successful!" -ForegroundColor Green
} else {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

