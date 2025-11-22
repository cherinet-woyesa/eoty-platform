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

async function createCommunityCommentsTable() {
  try {
    console.log('Creating community_post_comments table...');

    const exists = await db.schema.hasTable('community_post_comments');
    if (!exists) {
      await db.schema.createTable('community_post_comments', function(table) {
        table.increments('id').primary();
        table.integer('post_id').unsigned().notNullable()
          .references('id').inTable('community_posts').onDelete('CASCADE');
        table.string('author_id').notNullable();
        table.string('author_name').notNullable();
        table.string('author_avatar').nullable();
        table.text('content').notNullable();
        table.integer('parent_comment_id').nullable()
          .references('id').inTable('community_post_comments').onDelete('CASCADE'); // For nested replies
        table.integer('likes').defaultTo(0);
        table.timestamps(true, true);

        // Add indexes for performance
        table.index(['post_id', 'created_at']);
        table.index(['parent_comment_id']);
      });
      console.log('✅ Created community_post_comments table');
    } else {
      console.log('⚠️  community_post_comments table already exists');
    }

    console.log('✅ Community comments table setup complete!');
  } catch (error) {
    console.error('❌ Error creating community comments table:', error);
  } finally {
    await db.destroy();
  }
}

createCommunityCommentsTable();
