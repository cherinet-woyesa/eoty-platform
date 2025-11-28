const db = require('./config/database');

async function checkTables() {
  try {
    console.log('Checking database connection...');
    await db.raw('SELECT 1');
    console.log('Database connected successfully.');

    const tables = ['landing_page_content', 'testimonials', 'course_ratings', 'users', 'courses'];
    
    for (const table of tables) {
      const exists = await db.schema.hasTable(table);
      console.log(`Table '${table}' exists: ${exists}`);
      
      if (exists) {
        try {
          const count = await db(table).count('id as count').first();
          console.log(`  - Count: ${count.count}`);
        } catch (err) {
          console.log(`  - Error querying table: ${err.message}`);
        }
      }
    }

  } catch (error) {
    console.error('Database check failed:', error);
  } finally {
    process.exit();
  }
}

checkTables();
