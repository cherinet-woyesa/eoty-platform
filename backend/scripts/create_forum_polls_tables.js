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

async function createForumPollsTables() {
  try {
    console.log('Creating forum polls tables...');

    // Create forum_polls table
    const pollsExists = await db.schema.hasTable('forum_polls');
    if (!pollsExists) {
      await db.schema.createTable('forum_polls', function(table) {
        table.increments('id').primary();
        table.integer('topic_id').unsigned().notNullable()
          .references('id').inTable('forum_topics').onDelete('CASCADE');
        table.string('question').notNullable();
        table.text('description').nullable();
        table.boolean('allow_multiple_votes').defaultTo(false);
        table.boolean('is_anonymous').defaultTo(false);
        table.timestamp('ends_at').nullable(); // Poll expiration
        table.string('created_by').notNullable()
          .references('id').inTable('users').onDelete('CASCADE');
        table.timestamps(true, true);

        // Indexes
        table.index(['topic_id', 'created_at']);
        table.index(['created_by']);
      });
      console.log('✅ Created forum_polls table');
    } else {
      console.log('⚠️  forum_polls table already exists');
    }

    // Create forum_poll_options table
    const optionsExists = await db.schema.hasTable('forum_poll_options');
    if (!optionsExists) {
      await db.schema.createTable('forum_poll_options', function(table) {
        table.increments('id').primary();
        table.integer('poll_id').unsigned().notNullable()
          .references('id').inTable('forum_polls').onDelete('CASCADE');
        table.string('option_text').notNullable();
        table.integer('vote_count').defaultTo(0);
        table.integer('order_index').defaultTo(0); // For ordering options
        table.timestamps(true, true);

        // Indexes
        table.index(['poll_id', 'order_index']);
      });
      console.log('✅ Created forum_poll_options table');
    } else {
      console.log('⚠️  forum_poll_options table already exists');
    }

    // Create forum_poll_votes table
    const votesExists = await db.schema.hasTable('forum_poll_votes');
    if (!votesExists) {
      await db.schema.createTable('forum_poll_votes', function(table) {
        table.increments('id').primary();
        table.integer('poll_id').unsigned().notNullable()
          .references('id').inTable('forum_polls').onDelete('CASCADE');
        table.integer('option_id').unsigned().notNullable()
          .references('id').inTable('forum_poll_options').onDelete('CASCADE');
        table.string('user_id').notNullable()
          .references('id').inTable('users').onDelete('CASCADE');
        table.timestamp('voted_at').defaultTo(db.fn.now());

        // Prevent duplicate votes (one vote per user per poll, unless multiple votes allowed)
        table.unique(['poll_id', 'user_id']);

        // Indexes
        table.index(['poll_id', 'voted_at']);
        table.index(['user_id', 'voted_at']);
      });
      console.log('✅ Created forum_poll_votes table');
    } else {
      console.log('⚠️  forum_poll_votes table already exists');
    }

    console.log('✅ Forum polls tables setup complete!');
  } catch (error) {
    console.error('❌ Error creating forum polls tables:', error);
  } finally {
    await db.destroy();
  }
}

createForumPollsTables();
