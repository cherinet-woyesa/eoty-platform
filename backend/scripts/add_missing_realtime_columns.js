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

addMissingRealtimeColumns();
