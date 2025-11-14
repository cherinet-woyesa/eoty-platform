# Force Vercel to Deploy Latest Commit
# This script helps resolve issues where Vercel isn't detecting new commits

Write-Host "🔍 Checking Vercel deployment status..." -ForegroundColor Cyan

# Check if Vercel CLI is installed
$vercelVersion = vercel --version 2>$null
if (-not $vercelVersion) {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel@latest
}

# Get latest commit info
Write-Host "`n📝 Latest commit information:" -ForegroundColor Yellow
git log -1 --oneline

# Check if we're on main branch
$currentBranch = git rev-parse --abbrev-ref HEAD
Write-Host "`n🌿 Current branch: $currentBranch" -ForegroundColor Yellow

if ($currentBranch -ne "main") {
    Write-Host "⚠️  Warning: You're not on main branch. Vercel typically deploys from main." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Check if there are uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "`n⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    Write-Host $status
    $continue = Read-Host "`nContinue with deployment? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

# Check if local is ahead of remote
$localCommit = git rev-parse HEAD
$remoteCommit = git rev-parse origin/main 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n⚠️  Could not fetch remote commit. Make sure you've pushed your changes." -ForegroundColor Yellow
    Write-Host "   Run: git push origin main" -ForegroundColor Yellow
    $continue = Read-Host "`nContinue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host "`n🚀 Deploying to Vercel..." -ForegroundColor Cyan
Write-Host "   This will force Vercel to use the latest commit from your repository." -ForegroundColor Gray

# Deploy with --force flag to bypass cache
Write-Host "`n📦 Running: vercel --prod --force" -ForegroundColor Yellow
vercel --prod --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Deployment triggered successfully!" -ForegroundColor Green
    Write-Host "`n💡 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Check Vercel Dashboard: https://vercel.com/dashboard" -ForegroundColor White
    Write-Host "   2. Verify the deployment uses commit: $(git rev-parse --short HEAD)" -ForegroundColor White
    Write-Host "   3. If auto-deployment still doesn't work, check:" -ForegroundColor White
    Write-Host "      - Vercel Dashboard → Settings → Git → Verify repository connection" -ForegroundColor White
    Write-Host "      - Ensure Root Directory is set correctly (should be 'frontend' or empty)" -ForegroundColor White
} else {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host "`n💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Make sure you're logged in: vercel login" -ForegroundColor White
    Write-Host "   2. Check Vercel project settings in dashboard" -ForegroundColor White
    Write-Host "   3. Verify your vercel.json configuration" -ForegroundColor White
    exit 1
}

