/**
 * Script to create resource_exports table for export functionality
 * This creates the table needed for tracking resource exports
 */

// Force development environment and database config for local access
process.env.NODE_ENV = 'development';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'eoty_platform';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'Cherinet4!';

const db = require('../config/database');

async function createResourceExportsTable() {
  try {
    console.log('Creating resource_exports table...');

    // Check if table already exists
    const tableExists = await db.schema.hasTable('resource_exports');
    if (!tableExists) {
      await db.schema.createTable('resource_exports', function(table) {
        table.increments('id').primary();
        table.string('user_id').notNullable(); // Match users table id type
        table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
        table.string('export_type').notNullable(); // 'notes', 'summary', 'combined'
        table.string('format').notNullable(); // 'pdf', 'json', 'docx'
        table.jsonb('export_data').notNullable(); // The actual exported data
        table.timestamps(true, true);

        // Indexes for performance
        table.index(['user_id', 'created_at']);
        table.index(['resource_id', 'export_type']);
        table.index(['created_at']);
      });
      console.log('✅ resource_exports table created');
    } else {
      console.log('⚠️  resource_exports table already exists');
    }

    console.log('✅ Resource exports table setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating resource_exports table:', error);
    process.exit(1);
  }
}

createResourceExportsTable();
