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

async function addMissingAccessLogsColumns() {
  try {
    console.log('Adding missing columns to access_logs table...');

    // Check and add each missing column
    const hasUserRole = await db.schema.hasColumn('access_logs', 'user_role');
    const hasResource = await db.schema.hasColumn('access_logs', 'resource');
    const hasRequiredRole = await db.schema.hasColumn('access_logs', 'required_role');
    const hasAction = await db.schema.hasColumn('access_logs', 'action');
    const hasAccessGranted = await db.schema.hasColumn('access_logs', 'access_granted');
    const hasIpAddress = await db.schema.hasColumn('access_logs', 'ip_address');
    const hasUserAgent = await db.schema.hasColumn('access_logs', 'user_agent');
    const hasMetadata = await db.schema.hasColumn('access_logs', 'metadata');

    if (!hasUserRole) {
      await db.schema.table('access_logs', function(table) {
        table.string('user_role').nullable();
      });
      console.log('✅ Added user_role column');
    }

    if (!hasResource) {
      await db.schema.table('access_logs', function(table) {
        table.string('resource').notNullable();
      });
      console.log('✅ Added resource column');
    }

    if (!hasRequiredRole) {
      await db.schema.table('access_logs', function(table) {
        table.string('required_role').nullable();
      });
      console.log('✅ Added required_role column');
    }

    if (!hasAction) {
      await db.schema.table('access_logs', function(table) {
        table.string('action').notNullable();
      });
      console.log('✅ Added action column');
    }

    if (!hasAccessGranted) {
      await db.schema.table('access_logs', function(table) {
        table.boolean('access_granted').defaultTo(true);
      });
      console.log('✅ Added access_granted column');
    }

    if (!hasIpAddress) {
      await db.schema.table('access_logs', function(table) {
        table.string('ip_address').nullable();
      });
      console.log('✅ Added ip_address column');
    }

    if (!hasUserAgent) {
      await db.schema.table('access_logs', function(table) {
        table.text('user_agent').nullable();
      });
      console.log('✅ Added user_agent column');
    }

    if (!hasMetadata) {
      await db.schema.table('access_logs', function(table) {
        table.json('metadata').nullable();
      });
      console.log('✅ Added metadata column');
    }

    console.log('✅ Missing access_logs columns added successfully!');
  } catch (error) {
    console.error('❌ Error adding missing access_logs columns:', error);
  } finally {
    await db.destroy();
  }
}

addMissingAccessLogsColumns();
