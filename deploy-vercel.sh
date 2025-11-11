#!/bin/bash
# Vercel Deployment Script
# Run this script to deploy to Vercel production

echo "🚀 Starting Vercel deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel@latest
fi

# Deploy to production
echo "📦 Deploying to Vercel production..."
vercel --prod

if [ $? -eq 0 ]; then
    echo "✅ Deployment successful!"
else
    echo "❌ Deployment failed!"
    exit 1
fi

