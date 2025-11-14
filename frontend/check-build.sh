#!/bin/bash

# Build and Analyze Script
# This script builds the project and analyzes the output

echo "🔨 Building project..."
echo ""

# Build the project
cd frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo ""
echo "✅ Build completed successfully!"
echo ""

# Run analysis
echo "🔍 Analyzing build output..."
echo ""

node analyze-build.js

cd ..

