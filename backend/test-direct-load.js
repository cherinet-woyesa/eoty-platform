console.log('Starting direct load test...');

try {
  // Try to load the class definition
  const fs = require('fs');
  const code = fs.readFileSync('./services/authMetrics.js', 'utf8');
  console.log('File loaded, length:', code.length);
  console.log('First 100 chars:', code.substring(0, 100));
  console.log('Last 100 chars:', code.substring(code.length - 100));
  
  // Try to require it
  const authMetrics = require('./services/authMetrics');
  console.log('Module loaded');
  console.log('Type:', typeof authMetrics);
  console.log('Is instance of AuthMetrics:', authMetrics.constructor.name);
  
  // Try to call a method
  if (typeof authMetrics.trackLoginSuccess === 'function') {
    console.log('trackLoginSuccess exists');
    authMetrics.trackLoginSuccess();
    console.log('Method called successfully');
  } else {
    console.log('trackLoginSuccess does NOT exist');
    console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authMetrics)));
  }
} catch (error) {
  console.error('ERROR:', error.message);
  console.error('Stack:', error.stack);
}
