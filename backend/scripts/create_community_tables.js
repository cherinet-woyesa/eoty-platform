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

async function createCommunityTables() {
  try {
    console.log('Creating community tables...');

    // Create community_posts table
    const postsExists = await db.schema.hasTable('community_posts');
    if (!postsExists) {
      await db.schema.createTable('community_posts', function(table) {
        table.increments('id').primary();
        table.string('author_id').notNullable();
        table.string('author_name').notNullable();
        table.string('author_avatar').nullable();
        table.text('content').notNullable();
        table.string('media_type').nullable(); // 'image', 'video', 'audio', 'article'
        table.string('media_url').nullable();
        table.integer('likes').defaultTo(0);
        table.integer('comments').defaultTo(0);
        table.integer('shares').defaultTo(0);
        table.timestamps(true, true);

        // Add index for performance
        table.index(['author_id', 'created_at']);
      });
      console.log('✅ Created community_posts table');
    } else {
      console.log('⚠️  community_posts table already exists');
    }

    // Create community_post_likes table (optional, for tracking who liked what)
    const likesExists = await db.schema.hasTable('community_post_likes');
    if (!likesExists) {
      await db.schema.createTable('community_post_likes', function(table) {
        table.increments('id').primary();
        table.integer('post_id').unsigned().notNullable()
          .references('id').inTable('community_posts').onDelete('CASCADE');
        table.string('user_id').notNullable();
        table.timestamps(true, true);

        // Prevent duplicate likes
        table.unique(['post_id', 'user_id']);
      });
      console.log('✅ Created community_post_likes table');
    } else {
      console.log('⚠️  community_post_likes table already exists');
    }

    console.log('✅ Community tables setup complete!');
  } catch (error) {
    console.error('❌ Error creating community tables:', error);
  } finally {
    await db.destroy();
  }
}

createCommunityTables();
