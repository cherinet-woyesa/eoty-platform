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

async function addMissingRealtimeColumns() {
  try {
    console.log('Adding missing columns to realtime_update_queue table...');

    // Add missing columns to realtime_update_queue
    const hasRetryCount = await db.schema.hasColumn('realtime_update_queue', 'retry_count');
    const hasNextRetryAt = await db.schema.hasColumn('realtime_update_queue', 'next_retry_at');
    const hasUpdateData = await db.schema.hasColumn('realtime_update_queue', 'update_data');

    if (!hasRetryCount) {
      await db.schema.table('realtime_update_queue', function(table) {
        table.integer('retry_count').defaultTo(0);
      });
      console.log('✅ Added retry_count column');
    }

    if (!hasNextRetryAt) {
      await db.schema.table('realtime_update_queue', function(table) {
        table.timestamp('next_retry_at').nullable();
      });
      console.log('✅ Added next_retry_at column');
    }

    if (!hasUpdateData) {
      await db.schema.table('realtime_update_queue', function(table) {
        table.json('update_data').notNullable().defaultTo('{}');
      });
      console.log('✅ Added update_data column');
    }

    console.log('✅ Missing realtime columns added successfully!');
  } catch (error) {
    console.error('❌ Error adding missing realtime columns:', error);
  } finally {
    await db.destroy();
  }
}

async function addMissingCoursesColumns() {
  try {
    console.log('Adding missing columns to courses table...');

    // Add missing columns to courses table
    const hasCoverImage = await db.schema.hasColumn('courses', 'cover_image');
    const hasPrice = await db.schema.hasColumn('courses', 'price');
    const hasIsPublic = await db.schema.hasColumn('courses', 'is_public');
    const hasCertificationAvailable = await db.schema.hasColumn('courses', 'certification_available');
    const hasWelcomeMessage = await db.schema.hasColumn('courses', 'welcome_message');
    const hasStatus = await db.schema.hasColumn('courses', 'status');

    if (!hasCoverImage) {
      await db.schema.table('courses', function(table) {
        table.string('cover_image').nullable();
      });
      console.log('✅ Added cover_image column');
    }

    if (!hasPrice) {
      await db.schema.table('courses', function(table) {
        table.decimal('price', 10, 2).defaultTo(0);
      });
      console.log('✅ Added price column');
    }

    if (!hasIsPublic) {
      await db.schema.table('courses', function(table) {
        table.boolean('is_public').defaultTo(true);
      });
      console.log('✅ Added is_public column');
    }

    if (!hasCertificationAvailable) {
      await db.schema.table('courses', function(table) {
        table.boolean('certification_available').defaultTo(false);
      });
      console.log('✅ Added certification_available column');
    }

    if (!hasWelcomeMessage) {
      await db.schema.table('courses', function(table) {
        table.text('welcome_message').nullable();
      });
      console.log('✅ Added welcome_message column');
    }

    if (!hasStatus) {
      await db.schema.table('courses', function(table) {
        table.string('status').defaultTo('draft');
      });
      console.log('✅ Added status column');
    }

    console.log('✅ Missing courses columns added successfully!');
  } catch (error) {
    console.error('❌ Error adding missing courses columns:', error);
  } finally {
    await db.destroy();
  }
}

addMissingRealtimeColumns();

addMissingRealtimeColumns();
