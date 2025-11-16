// backend/jobs/autoArchiveJob.js
// Auto-Archive Job - REQUIREMENT: Auto-archiving for inactive chapters

const socialFeaturesService = require('../services/socialFeaturesService');

class AutoArchiveJob {
  constructor() {
    this.archiveInterval = 24 * 60 * 60 * 1000; // Run daily
    this.jobActive = false;
  }

  // Start auto-archiving job
  start() {
    if (this.jobActive) {
      console.log('Auto-archive job already active');
      return;
    }

    this.jobActive = true;
    console.log('Starting auto-archive job for inactive forums and chapters...');

    // Run immediately on start
    this.runArchive().catch(console.error);

    // Schedule daily runs
    this.archiveIntervalId = setInterval(() => {
      this.runArchive().catch(console.error);
    }, this.archiveInterval);
  }

  // Stop auto-archiving job
  stop() {
    if (this.archiveIntervalId) {
      clearInterval(this.archiveIntervalId);
      this.jobActive = false;
      console.log('Stopped auto-archive job');
    }
  }

  // Run archive process
  async runArchive() {
    try {
      console.log('Running auto-archive job...');
      
      // Archive inactive forums
      const forumsResult = await socialFeaturesService.autoArchiveInactiveForums();
      console.log(`Archived ${forumsResult.archived} inactive forums`);

      // Archive inactive chapters
      const chaptersResult = await socialFeaturesService.autoArchiveInactiveChapters();
      console.log(`Archived ${chaptersResult.archived} inactive chapters`);

      return {
        forumsArchived: forumsResult.archived,
        chaptersArchived: chaptersResult.archived,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Auto-archive job error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const autoArchiveJob = new AutoArchiveJob();

module.exports = autoArchiveJob;


