const { knex } = require('knex');

// Load environment variables first
require('dotenv').config();

const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD), // Ensure password is a string
  },
  migrations: {
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

const db = knex(dbConfig);

// Test the connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ PostgreSQL connected successfully');
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection failed:', err);
  });

module.exports = db;