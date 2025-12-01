const { knex } = require('knex');

// Load environment variables first
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Google Cloud SQL configuration
const getCloudSQLConfig = () => {
  const connectionName = process.env.CLOUD_SQL_CONNECTION_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;

  if (!connectionName) {
    throw new Error('CLOUD_SQL_CONNECTION_NAME environment variable is required');
  }

  return {
    host: `/cloudsql/${connectionName}`,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    // Cloud SQL via Unix socket does NOT support SSL
    ssl: false
  };
};

// Development/Local configuration
const getLocalConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'edu_platform',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || 'password'),
});

const dbConfig = {
  client: 'pg',
  connection: isProduction ? getCloudSQLConfig() : getLocalConfig(),
  pool: {
    min: 0,
    max: isProduction ? 10 : 5,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 40000,
    idleTimeoutMillis: 600000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
  migrations: {
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
};

const db = knex(dbConfig);

// Test the connection with retry logic
const testConnection = async (retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      await db.raw('SELECT 1');
      console.log('✅ PostgreSQL connected successfully');
      return;
    } catch (err) {
      console.error(`❌ PostgreSQL connection attempt ${i + 1} failed:`, err.message);

      if (i === retries - 1) {
        console.error('❌ All connection attempts failed');
        if (process.env.NODE_ENV === 'production') {
          throw err;
        } else {
          console.warn('⚠️ Continuing without database connection (Development/Test Mode)');
          return;
        }
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
};

testConnection();

module.exports = db;
