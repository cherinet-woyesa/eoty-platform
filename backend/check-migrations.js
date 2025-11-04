const knex = require('knex')(require('./knexfile').development);

async function checkMigrations() {
  try {
    const migrations = await knex('knex_migrations')
      .select('*')
      .orderBy('id', 'desc')
      .limit(10);
    
    console.log('Recent migrations:');
    migrations.forEach(m => {
      console.log(`- ${m.name} (batch ${m.batch})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkMigrations();
