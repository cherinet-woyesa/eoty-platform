const knex = require('knex');
const knexConfig = require('../knexfile');

// Initialize knex with the development configuration
const db = knex(knexConfig.development);

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    // Run migrations
    console.log('Running migrations...');
    await db.migrate.latest();
    console.log('Migrations completed successfully!');
    
    // Run seeds
    console.log('Running seeds...');
    await db.seed.run();
    console.log('Seeds completed successfully!');
    
    console.log('Database initialization completed!');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

initDatabase();