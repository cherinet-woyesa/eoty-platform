#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Skip auto-migration for now and start server directly
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
