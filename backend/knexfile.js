// knexfile.js
// dotenv is not needed in Docker - environment variables are passed by docker-compose
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Cherinet4!',
      database: process.env.DB_NAME || 'eoty_platform',
      port: parseInt(process.env.DB_PORT) || 5432
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  },
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'eoty_platform',
      port: parseInt(process.env.DB_PORT) || 5432,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      connectTimeout: 10000, // 10 seconds
      requestTimeout: 30000, // 30 seconds
    },
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      timeout: 60000, // 60 seconds per migration
    },
    seeds: {
      directory: './seeds'
    }
  },
  google_cloud: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST, // /cloudsql/project:region:instance format for Cloud SQL
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: { rejectUnauthorized: false }, // Required for Cloud SQL
      connectTimeout: 15000, // 15 seconds
      requestTimeout: 45000, // 45 seconds for migrations
    },
    pool: {
      min: 1,
      max: 5,
      acquireTimeoutMillis: 45000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 40000,
      idleTimeoutMillis: 600000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
      timeout: 90000, // 90 seconds for Cloud SQL migrations
    },
    seeds: {
      directory: './seeds'
    }
  }
};