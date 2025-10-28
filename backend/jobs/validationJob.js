const ValidationService = require('../services/validationService');

// This job should be run periodically (e.g., every hour) to validate system acceptance criteria
async function runValidationJob() {
  try {
    console.log('Running system validation job...');
    
    // Run all acceptance criteria validations
    const results = await ValidationService.runAllValidations();
    
    console.log('Validation job completed:', results.overallStatus);
    
    // If validation is failing, you might want to send alerts or notifications
    if (results.overallStatus !== 'passing') {
      console.warn('System validation is failing! Please check the system.');
      // In a real implementation, this would send alerts to administrators
    }
    
    return results;
  } catch (error) {
    console.error('Validation job error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// For testing purposes, we can export a function to run the job manually
module.exports = {
  runValidationJob
};

// If this file is run directly (node validationJob.js), run the job once
if (require.main === module) {
  runValidationJob().then(() => {
    console.log('Validation job finished');
    process.exit(0);
  }).catch((error) => {
    console.error('Validation job failed:', error);
    process.exit(1);
  });
}