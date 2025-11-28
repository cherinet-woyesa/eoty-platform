const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'Cherinet4!',
  database: 'postgres',
  ssl: false
});

async function createDb() {
  try {
    await client.connect();
    console.log('Connected to postgres DB.');
    await client.query('CREATE DATABASE "eoty-platform"');
    console.log('Database "eoty-platform" created successfully!');
  } catch (err) {
    if (err.code === '42P04') {
      console.log('Database "eoty-platform" already exists.');
    } else {
      console.error('Error creating database:', err);
    }
  } finally {
    await client.end();
  }
}

createDb();
