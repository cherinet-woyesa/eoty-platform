#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

async function start() {
  console.log('🚀 Starting application...');

  // Run migrations
  try {
    console.log('🔄 Running database migrations...');
    const db = require('../config/database');
    await db.migrate.latest();
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    // Continue anyway, as the server might still work or we want to see logs
  }

  console.log('🚀 Starting server...');
  const serverProcess = spawn('node', [path.join(__dirname, '../server.js')], {
    stdio: 'inherit',
    shell: true
  });

  serverProcess.on('close', (serverCode) => {
    console.log(`Server exited with code ${serverCode}`);
    process.exit(serverCode);
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

start();
