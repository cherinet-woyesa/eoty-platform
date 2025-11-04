// Clear the require cache
delete require.cache[require.resolve('./services/authMetrics')];

const authMetrics = require('./services/authMetrics');

console.log('Type:', typeof authMetrics);
console.log('Constructor:', authMetrics.constructor.name);
console.log('Has reset:', typeof authMetrics.reset);
console.log('Has trackLoginSuccess:', typeof authMetrics.trackLoginSuccess);

if (typeof authMetrics.reset === 'function') {
  console.log('\n✓ reset method exists!');
  authMetrics.reset();
  console.log('✓ reset called successfully');
} else {
  console.log('\n✗ reset method does NOT exist');
  console.log('Prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(authMetrics)));
}
