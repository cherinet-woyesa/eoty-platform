#!/usr/bin/env node

/**
 * Build Analysis Script
 * Analyzes the Vite build output to verify React bundling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Analyzing build output...\n');

const distDir = path.join(__dirname, 'dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(distDir)) {
  console.error('❌ dist directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// Get all JS files
const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));

console.log('📦 Build Output Files:\n');
console.log('='.repeat(80));

const chunks = {
  main: [],
  reactVendor: [],
  vendor: [],
  other: []
};

let totalSize = 0;
let reactInMain = false;
let reactInVendor = false;
let reactDepsInVendor = [];

files.forEach(file => {
  const filePath = path.join(assetsDir, file);
  const stats = fs.statSync(filePath);
  const sizeKB = (stats.size / 1024).toFixed(2);
  totalSize += stats.size;
  
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  const sizeStr = sizeMB > 1 ? `${sizeMB} MB` : `${sizeKB} KB`;
  
  // Read file content to check for React
  const content = fs.readFileSync(filePath, 'utf8');
  const hasReact = content.includes('react') || content.includes('React') || content.includes('useState');
  const hasReactDom = content.includes('react-dom') || content.includes('reactDom');
  const hasReactRouter = content.includes('react-router');
  const hasReactQuery = content.includes('react-query') || content.includes('@tanstack');
  const hasMux = content.includes('@mux');
  const hasFramer = content.includes('framer-motion');
  const hasRecharts = content.includes('recharts');
  
  let category = 'other';
  if (file.includes('index-') && !file.includes('vendor')) {
    category = 'main';
    chunks.main.push({ file, size: sizeStr, sizeBytes: stats.size });
    if (hasReact || hasReactDom) {
      reactInMain = true;
      console.log(`✅ MAIN BUNDLE: ${file} (${sizeStr}) - Contains React`);
    } else {
      console.log(`⚠️  MAIN BUNDLE: ${file} (${sizeStr}) - React NOT found!`);
    }
  } else if (file.includes('react-vendor')) {
    category = 'reactVendor';
    chunks.reactVendor.push({ file, size: sizeStr, sizeBytes: stats.size });
    console.log(`📦 REACT-VENDOR: ${file} (${sizeStr})`);
  } else if (file.includes('vendor')) {
    category = 'vendor';
    chunks.vendor.push({ file, size: sizeStr, sizeBytes: stats.size });
    
    // Check if vendor chunk contains React (this is a problem!)
    if (hasReact || hasReactDom || hasReactQuery || hasMux || hasFramer || hasRecharts) {
      reactInVendor = true;
      reactDepsInVendor.push(file);
      console.log(`❌ VENDOR: ${file} (${sizeStr}) - Contains React dependencies!`);
    } else {
      console.log(`📦 VENDOR: ${file} (${sizeStr})`);
    }
  } else {
    category = 'other';
    chunks.other.push({ file, size: sizeStr, sizeBytes: stats.size });
    console.log(`📄 OTHER: ${file} (${sizeStr})`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('\n📊 Analysis Summary:\n');

// Check main bundle
const mainBundle = chunks.main[0];
if (mainBundle) {
  console.log(`Main Bundle: ${mainBundle.file} (${mainBundle.size})`);
  if (reactInMain) {
    console.log('✅ React is in main bundle - GOOD!');
  } else {
    console.log('❌ React is NOT in main bundle - PROBLEM!');
  }
} else {
  console.log('❌ No main bundle found!');
}

// Check react-vendor
if (chunks.reactVendor.length > 0) {
  console.log(`\nReact-Vendor Chunks: ${chunks.reactVendor.length}`);
  chunks.reactVendor.forEach(chunk => {
    console.log(`  - ${chunk.file} (${chunk.size})`);
  });
} else {
  console.log('\n⚠️  No react-vendor chunk found');
}

// Check vendor chunks
if (chunks.vendor.length > 0) {
  console.log(`\nVendor Chunks: ${chunks.vendor.length}`);
  chunks.vendor.forEach(chunk => {
    console.log(`  - ${chunk.file} (${chunk.size})`);
  });
  
  if (reactInVendor) {
    console.log('\n❌ PROBLEM: React dependencies found in vendor chunks!');
    console.log('   Files:', reactDepsInVendor.join(', '));
    console.log('   This can cause "Cannot read properties of undefined" errors.');
  } else {
    console.log('\n✅ No React dependencies in vendor chunks - GOOD!');
  }
}

// Total size
const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
console.log(`\n📏 Total Bundle Size: ${totalMB} MB`);

// Recommendations
console.log('\n' + '='.repeat(80));
console.log('\n💡 Recommendations:\n');

if (!reactInMain) {
  console.log('❌ React must be in the main bundle. Check vite.config.ts manualChunks.');
}

if (reactInVendor) {
  console.log('❌ React dependencies should not be in vendor chunks.');
  console.log('   Move them to react-vendor chunk in vite.config.ts.');
}

if (reactInMain && !reactInVendor) {
  console.log('✅ Build looks good! React is in main bundle and dependencies are separated.');
  console.log('   If errors persist, check:');
  console.log('   1. Browser console for specific error messages');
  console.log('   2. Network tab to verify chunk loading order');
  console.log('   3. Ensure index.html loads main bundle first');
}

console.log('\n');

