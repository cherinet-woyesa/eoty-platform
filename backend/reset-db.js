const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'Cherinet4!',
  database: 'postgres',
  ssl: false
});

async function resetDb() {
  try {
    await client.connect();
    console.log('Connected to postgres DB.');
    
    // Terminate existing connections to the database
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = 'eoty-platform'
        AND pid <> pg_backend_pid();
    `);
    console.log('Terminated existing connections.');

    await client.query('DROP DATABASE IF EXISTS "eoty-platform"');
    console.log('Database "eoty-platform" dropped.');
    
    await client.query('CREATE DATABASE "eoty-platform"');
    console.log('Database "eoty-platform" created successfully!');
  } catch (err) {
    console.error('Error resetting database:', err);
  } finally {
    await client.end();
  }
}

resetDb();
