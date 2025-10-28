#!/usr/bin/env node

const aiService = require('../services/aiService');

/**
 * Cleanup script for old AI conversations
 * This script removes conversations older than the retention period
 * to ensure compliance with privacy policies
 */

async function cleanupConversations() {
  console.log('Starting conversation cleanup...');
  
  try {
    await aiService.cleanupOldConversations();
    console.log('Conversation cleanup completed successfully');
  } catch (error) {
    console.error('Error during conversation cleanup:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupConversations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupConversations };