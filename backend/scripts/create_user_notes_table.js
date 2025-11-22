/**
 * Script to create user_notes table with section anchoring support
 * This creates the table needed for the notes functionality
 */

// Force development environment and database config for local access
process.env.NODE_ENV = 'development';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'eoty_platform';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'Cherinet4!';

const db = require('../config/database');

async function createUserNotesTable() {
  try {
    console.log('Creating user_notes table...');

    // Check if table already exists
    const tableExists = await db.schema.hasTable('user_notes');
    if (!tableExists) {
      await db.schema.createTable('user_notes', function(table) {
        table.increments('id').primary();
        table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
        table.text('content').notNullable();
        table.boolean('is_public').defaultTo(false);

        // Section anchoring columns (REQUIREMENT: Anchor notes to sections)
        table.string('anchor_point').nullable(); // Legacy support
        table.string('section_anchor').nullable(); // New section anchoring
        table.text('section_text').nullable(); // Excerpt of section text
        table.integer('section_position').nullable(); // Position in document

        // Tags for organization
        table.jsonb('tags').nullable();

        table.timestamps(true, true);

        // Indexes for performance
        table.index(['user_id', 'resource_id']);
        table.index(['resource_id', 'is_public']);
        table.index(['created_at']);
      });
      console.log('✅ user_notes table created');
    } else {
      console.log('⚠️  user_notes table already exists');

      // Check if we need to add missing columns
      const columns = await db.raw("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_notes'");
      const columnNames = columns.rows.map(row => row.column_name);

      if (!columnNames.includes('section_anchor')) {
        await db.schema.table('user_notes', function(table) {
          table.string('section_anchor').nullable();
        });
        console.log('✅ Added section_anchor column');
      }

      if (!columnNames.includes('section_text')) {
        await db.schema.table('user_notes', function(table) {
          table.text('section_text').nullable();
        });
        console.log('✅ Added section_text column');
      }

      if (!columnNames.includes('section_position')) {
        await db.schema.table('user_notes', function(table) {
          table.integer('section_position').nullable();
        });
        console.log('✅ Added section_position column');
      }

      if (!columnNames.includes('tags')) {
        await db.schema.table('user_notes', function(table) {
          table.jsonb('tags').nullable();
        });
        console.log('✅ Added tags column');
      }

      if (!columnNames.includes('anchor_point')) {
        await db.schema.table('user_notes', function(table) {
          table.string('anchor_point').nullable();
        });
        console.log('✅ Added anchor_point column');
      }
    }

    console.log('✅ User notes table setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating user_notes table:', error);
    process.exit(1);
  }
}

createUserNotesTable();
