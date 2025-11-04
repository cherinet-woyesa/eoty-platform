const knex = require('knex')(require('./knexfile').development);

async function clearRateLimits() {
  try {
    console.log('\n🧹 Clearing rate limit data...\n');
    
    // Check if there's a rate limit table
    const tables = await knex.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%rate%'
    `);
    
    if (tables.rows.length > 0) {
      console.log('Found rate limit tables:');
      tables.rows.forEach(t => console.log(`  - ${t.table_name}`));
      
      for (const table of tables.rows) {
        await knex(table.table_name).del();
        console.log(`✅ Cleared ${table.table_name}`);
      }
    } else {
      console.log('ℹ️  No rate limit tables found (rate limiting might be in-memory)');
    }
    
    console.log('\n💡 To fully clear rate limits:');
    console.log('   1. Restart the backend server');
    console.log('   2. Wait 1-2 minutes');
    console.log('   3. Try logging in again\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearRateLimits();
