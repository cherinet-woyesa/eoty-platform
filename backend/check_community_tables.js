const knex = require('knex')(require('./knexfile').development);

async function checkTables() {
  const tables = ['community_posts', 'community_post_comments', 'community_post_shares', 'community_post_likes'];
  for (const table of tables) {
    const exists = await knex.schema.hasTable(table);
    console.log(`Table ${table} exists: ${exists}`);
  }
  process.exit(0);
}

checkTables();
