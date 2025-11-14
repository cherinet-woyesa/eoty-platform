# Build and Analyze Script for Windows
# This script builds the project and analyzes the output

Write-Host "🔨 Building project..." -ForegroundColor Cyan
Write-Host ""

# Build the project
cd frontend
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Run analysis
Write-Host "🔍 Analyzing build output..." -ForegroundColor Cyan
Write-Host ""

node analyze-build.js

cd ..

