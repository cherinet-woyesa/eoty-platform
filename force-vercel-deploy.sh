#!/bin/bash

# Force Vercel to Deploy Latest Commit
# This script helps resolve issues where Vercel isn't detecting new commits

echo "🔍 Checking Vercel deployment status..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel@latest
fi

# Get latest commit info
echo ""
echo "📝 Latest commit information:"
git log -1 --oneline

# Check if we're on main branch
currentBranch=$(git rev-parse --abbrev-ref HEAD)
echo ""
echo "🌿 Current branch: $currentBranch"

if [ "$currentBranch" != "main" ]; then
    echo "⚠️  Warning: You're not on main branch. Vercel typically deploys from main."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if there are uncommitted changes
status=$(git status --porcelain)
if [ -n "$status" ]; then
    echo ""
    echo "⚠️  You have uncommitted changes:"
    echo "$status"
    read -p "Continue with deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if local is ahead of remote
localCommit=$(git rev-parse HEAD)
remoteCommit=$(git rev-parse origin/main 2>/dev/null)

if [ $? -ne 0 ]; then
    echo ""
    echo "⚠️  Could not fetch remote commit. Make sure you've pushed your changes."
    echo "   Run: git push origin main"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🚀 Deploying to Vercel..."
echo "   This will force Vercel to use the latest commit from your repository."

# Deploy with --force flag to bypass cache
echo ""
echo "📦 Running: vercel --prod --force"
vercel --prod --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment triggered successfully!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Check Vercel Dashboard: https://vercel.com/dashboard"
    echo "   2. Verify the deployment uses commit: $(git rev-parse --short HEAD)"
    echo "   3. If auto-deployment still doesn't work, check:"
    echo "      - Vercel Dashboard → Settings → Git → Verify repository connection"
    echo "      - Ensure Root Directory is set correctly (should be 'frontend' or empty)"
else
    echo ""
    echo "❌ Deployment failed!"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Make sure you're logged in: vercel login"
    echo "   2. Check Vercel project settings in dashboard"
    echo "   3. Verify your vercel.json configuration"
    exit 1
fi

