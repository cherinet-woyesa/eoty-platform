const knex = require('knex');
require('dotenv').config();

const dbConfig = {
  client: 'postgresql',
  connection: {
    host: process.env.DB_HOST || '34.29.208.15',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'eoty-platform',
    password: process.env.DB_PASSWORD || 'Cherinet4!',
    database: process.env.DB_NAME || 'eoty-platform'
  }
};

console.log('Testing database connection...');
console.log('Config:', {
  host: dbConfig.connection.host,
  port: dbConfig.connection.port,
  user: dbConfig.connection.user,
  database: dbConfig.connection.database
});

const db = knex(dbConfig);

db.raw('SELECT 1 as test')
  .then(result => {
    console.log('✅ Database connection successful!');
    console.log('Result:', result.rows);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    process.exit(1);
  })
  .finally(() => {
    db.destroy();
  });