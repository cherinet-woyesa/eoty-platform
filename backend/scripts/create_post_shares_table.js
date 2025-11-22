const knex = require('knex');
require('dotenv').config();

const dbConfig = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: String(process.env.DB_PASSWORD),
  },
};

const db = knex(dbConfig);

async function createPostSharesTable() {
  try {
    console.log('Creating community_post_shares table...');

    const exists = await db.schema.hasTable('community_post_shares');
    if (!exists) {
      await db.schema.createTable('community_post_shares', function(table) {
        table.increments('id').primary();
        table.integer('post_id').unsigned().notNullable()
          .references('id').inTable('community_posts').onDelete('CASCADE');
        table.string('shared_by').notNullable()
          .references('id').inTable('users').onDelete('CASCADE');
        table.string('shared_with').nullable() // User ID if shared with specific user, null if shared with chapter
          .references('id').inTable('users').onDelete('CASCADE');
        table.integer('chapter_id').nullable() // Chapter ID if shared with chapter
          .references('id').inTable('chapters').onDelete('CASCADE');
        table.text('message').nullable(); // Optional message when sharing
        table.string('share_type').defaultTo('chapter') // 'user', 'chapter', 'public'
          .notNullable();
        table.timestamps(true, true);

        // Prevent duplicate shares
        table.unique(['post_id', 'shared_by', 'shared_with', 'chapter_id']);

        // Add indexes for performance
        table.index(['post_id', 'created_at']);
        table.index(['shared_by', 'created_at']);
        table.index(['shared_with']);
        table.index(['chapter_id']);
      });
      console.log('✅ Created community_post_shares table');
    } else {
      console.log('⚠️  community_post_shares table already exists');
    }

    console.log('✅ Post shares table setup complete!');
  } catch (error) {
    console.error('❌ Error creating post shares table:', error);
  } finally {
    await db.destroy();
  }
}

createPostSharesTable();
