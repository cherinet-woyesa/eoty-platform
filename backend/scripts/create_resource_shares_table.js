/**
 * Script to create resource_shares table for sharing functionality
 * This creates the table needed for tracking resource shares with chapters
 */

// Force development environment and database config for local access
process.env.NODE_ENV = 'development';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'eoty_platform';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'Cherinet4!';

const db = require('../config/database');

async function createResourceSharesTable() {
  try {
    console.log('Creating resource_shares table...');

    // Check if table already exists
    const tableExists = await db.schema.hasTable('resource_shares');
    if (!tableExists) {
      await db.schema.createTable('resource_shares', function(table) {
        table.increments('id').primary();
        table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
        table.string('shared_by').notNullable(); // Match users table id type
        table.integer('chapter_id').unsigned().notNullable().references('id').inTable('chapters').onDelete('CASCADE');
        table.string('share_type').notNullable(); // 'view', 'edit', etc.
        table.text('message').nullable(); // Optional message with share
        table.timestamps(true, true);

        // Indexes for performance
        table.index(['resource_id', 'chapter_id']);
        table.index(['shared_by', 'created_at']);
        table.index(['chapter_id', 'created_at']);
      });
      console.log('✅ resource_shares table created');
    } else {
      console.log('⚠️  resource_shares table already exists');
    }

    console.log('✅ Resource shares table setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating resource_shares table:', error);
    process.exit(1);
  }
}

createResourceSharesTable();
