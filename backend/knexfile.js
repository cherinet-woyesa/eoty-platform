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
    connection: {
      host: process.env.DB_HOST || 'postgres',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'eoty_platform',
      port: parseInt(process.env.DB_PORT) || 5432
    },
    migrations: {
      directory: './migrations'
    },
    seeds: {
      directory: './seeds'
    }
  }
};