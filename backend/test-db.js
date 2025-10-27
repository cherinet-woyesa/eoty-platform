require('dotenv').config();
const db = require('./config/database');

console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);

console.log('\nDatabase config:');
console.log('Host:', db.client.config.connection.host);
console.log('User:', db.client.config.connection.user);
console.log('Database:', db.client.config.connection.database);

// Test the connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ PostgreSQL connected successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection failed:', err);
    process.exit(1);
  });