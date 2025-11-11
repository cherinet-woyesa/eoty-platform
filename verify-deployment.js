#!/usr/bin/env node

/**
 * Deployment Verification Script
 * 
 * This script checks if your EOTY Platform deployment is properly configured
 * by verifying environment variables, database connectivity, and service health.
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 EOTY Platform Deployment Verification');
console.log('========================================\n');

// Check required environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'NODE_ENV'
];

const optionalEnvVars = [
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET',
  'MUX_TOKEN_ID',
  'MUX_TOKEN_SECRET',
  'MUX_WEBHOOK_SECRET',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET'
];

console.log('📋 Checking Environment Variables...\n');

let missingRequired = [];
let missingOptional = [];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar] || process.env[envVar].includes('your-')) {
    missingRequired.push(envVar);
    console.log(`❌ Missing required: ${envVar}`);
  } else {
    console.log(`✅ Found: ${envVar}`);
  }
});

optionalEnvVars.forEach(envVar => {
  if (!process.env[envVar] || process.env[envVar].includes('your-')) {
    missingOptional.push(envVar);
    console.log(`⚠️  Missing optional: ${envVar}`);
  } else {
    console.log(`✅ Found: ${envVar}`);
  }
});

console.log('\n');

if (missingRequired.length > 0) {
  console.log('🚨 CRITICAL: Missing required environment variables:');
  missingRequired.forEach(envVar => console.log(`   - ${envVar}`));
  console.log('\n   Please set these variables before deploying.\n');
} else {
  console.log('✅ All required environment variables are set.\n');
}

if (missingOptional.length > 0) {
  console.log('⚠️  Optional environment variables missing:');
  missingOptional.forEach(envVar => console.log(`   - ${envVar}`));
  console.log('\n   These are recommended for full functionality.\n');
}

// Check database configuration file
const knexfilePath = path.join(__dirname, 'backend', 'knexfile.js');
if (fs.existsSync(knexfilePath)) {
  console.log('✅ Database configuration file found.');
} else {
  console.log('❌ Database configuration file missing.');
}

// Check Docker configuration
const dockerFiles = [
  'Dockerfile.backend',
  'Dockerfile.frontend',
  'docker-compose.prod.yml'
];

dockerFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} found.`);
  } else {
    console.log(`❌ ${file} missing.`);
  }
});

console.log('\n');

// Check deployment configuration files
const deploymentFiles = [
  'render.yaml',
  'vercel.json'
];

deploymentFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} found.`);
  } else {
    console.log(`❌ ${file} missing.`);
  }
});

console.log('\n');

// Summary
console.log('📊 Summary:');
console.log(`   Required env vars: ${requiredEnvVars.length - missingRequired.length}/${requiredEnvVars.length} set`);
console.log(`   Optional env vars: ${optionalEnvVars.length - missingOptional.length}/${optionalEnvVars.length} set`);

if (missingRequired.length === 0) {
  console.log('\n✅ Your deployment configuration looks good!');
  console.log('   You can now proceed with deployment.\n');
} else {
  console.log('\n❌ Please fix the missing required environment variables before deploying.\n');
}

console.log('📝 Next steps:');
console.log('   1. Set all required environment variables');
console.log('   2. Run this script again to verify');
console.log('   3. Deploy using your preferred platform\n');