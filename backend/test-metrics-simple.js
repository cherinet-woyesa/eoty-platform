const authMetrics = require('./services/authMetrics');

console.log('authMetrics type:', typeof authMetrics);
console.log('authMetrics keys:', Object.keys(authMetrics));
console.log('Has reset method:', typeof authMetrics.reset);
console.log('Has trackLoginSuccess method:', typeof authMetrics.trackLoginSuccess);
