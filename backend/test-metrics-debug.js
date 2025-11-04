try {
  console.log('Loading authMetrics...');
  const authMetrics = require('./services/authMetrics');
  console.log('Loaded successfully');
  console.log('authMetrics type:', typeof authMetrics);
  console.log('authMetrics constructor:', authMetrics.constructor.name);
  console.log('authMetrics keys:', Object.getOwnPropertyNames(authMetrics));
  console.log('authMetrics prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(authMetrics)));
} catch (error) {
  console.error('Error loading authMetrics:', error);
  console.error('Stack:', error.stack);
}
