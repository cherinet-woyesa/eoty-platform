const { knex } = require('knex');
const { Client } = require('pg'); // Import pg Client for direct testing

// Load environment variables first
require('dotenv').config();

const connectionConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD), // Ensure password is a string
};

// Only enable SSL if explicitly requested and NOT connecting via Cloud SQL Auth Proxy
if (process.env.DB_HOST && process.env.DB_HOST.startsWith('/')) {
  // Explicitly disable SSL for Cloud SQL sockets to prevent "server does not support SSL" errors
  connectionConfig.ssl = false;
} else if (process.env.DB_SSL === 'true') {
  connectionConfig.ssl = { rejectUnauthorized: false };
}

const dbConfig = {
  client: 'pg',
  connection: connectionConfig,
  pool: {
    min: 0,
    max: 10,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
  migrations: {
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

// Debug connection config (sanitized)
console.log('DB Config:', {
  client: dbConfig.client,
  connection: {
    ...dbConfig.connection,
    password: '***'
  },
  PGSSLMODE: process.env.PGSSLMODE
});

// Test direct pg connection (bypass knex to isolate issue)
// This seems to help knex work, possibly by priming the socket or something?
// REMOVED: Side-effects in module loading can cause startup issues in Cloud Run
/*
const testDirectConnection = async () => {
  console.log('Testing direct pg connection...');
  const client = new Client(connectionConfig);
  try {
    await client.connect();
    console.log('✅ Direct PG connection successful');
    await client.end();
  } catch (err) {
    console.error('❌ Direct PG connection failed:', err);
    try { await client.end(); } catch (e) {}
  }
};
testDirectConnection();
*/

const db = knex(dbConfig);

// Test the connection
// REMOVED: Side-effects in module loading can cause startup issues in Cloud Run
/*
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ PostgreSQL connected successfully');
  })
  .catch((err) => {
    console.error('❌ PostgreSQL connection failed:', err);
  });
*/

module.exports = db;