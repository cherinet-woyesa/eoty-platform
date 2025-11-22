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

async function createForumTables() {
  try {
    console.log('Creating forum interaction tables...');

    // Create forum_topic_likes table
    const likesExists = await db.schema.hasTable('forum_topic_likes');
    if (!likesExists) {
      await db.schema.createTable('forum_topic_likes', function(table) {
        table.increments('id').primary();
        table.integer('topic_id').unsigned().notNullable()
          .references('id').inTable('forum_topics').onDelete('CASCADE');
        table.string('user_id').notNullable(); // Match users table id type
        table.timestamps(true, true);
        table.unique(['topic_id', 'user_id']);
      });
      console.log('✅ Created forum_topic_likes table');
    } else {
      console.log('⚠️  forum_topic_likes table already exists');
    }

    // Create forum_reports table
    const reportsExists = await db.schema.hasTable('forum_reports');
    if (!reportsExists) {
      await db.schema.createTable('forum_reports', function(table) {
        table.increments('id').primary();
        table.integer('topic_id').unsigned().notNullable()
          .references('id').inTable('forum_topics').onDelete('CASCADE');
        table.string('reported_by').notNullable(); // Match users table id type
        table.string('reason').notNullable();
        table.text('details');
        table.string('status').defaultTo('pending');
        table.timestamps(true, true);
        table.unique(['topic_id', 'reported_by']);
      });
      console.log('✅ Created forum_reports table');
    } else {
      console.log('⚠️  forum_reports table already exists');
    }

    // Add like_count to forum_topics if it doesn't exist
    const hasLikeCount = await db.schema.hasColumn('forum_topics', 'like_count');
    if (!hasLikeCount) {
      await db.schema.table('forum_topics', table => {
        table.integer('like_count').defaultTo(0);
      });
      console.log('✅ Added like_count column to forum_topics');
    } else {
      console.log('⚠️  like_count column already exists in forum_topics');
    }

    console.log('✅ Forum interaction tables setup complete!');
  } catch (error) {
    console.error('❌ Error creating forum tables:', error);
  } finally {
    await db.destroy();
  }
}

createForumTables();
