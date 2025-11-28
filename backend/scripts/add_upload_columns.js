/**
 * Script to add missing columns to content_uploads table
 * Adds public_url and storage_type columns for GCS/local storage support
 */

const db = require('../config/database');

async function addUploadColumns() {
  try {
    console.log('Checking content_uploads table columns...');

    const tableExists = await db.schema.hasTable('content_uploads');
    if (!tableExists) {
      console.log('❌ content_uploads table does not exist. Run create_content_tables.js first.');
      process.exit(1);
    }

    // Check if public_url column exists
    const publicUrlExists = await db.schema.hasColumn('content_uploads', 'public_url');
    if (!publicUrlExists) {
      console.log('Adding public_url column...');
      await db.schema.alterTable('content_uploads', (table) => {
        table.string('public_url').nullable();
      });
      console.log('✅ Added public_url column');
    } else {
      console.log('✅ public_url column already exists');
    }

    // Check if storage_type column exists
    const storageTypeExists = await db.schema.hasColumn('content_uploads', 'storage_type');
    if (!storageTypeExists) {
      console.log('Adding storage_type column...');
      await db.schema.alterTable('content_uploads', (table) => {
        table.string('storage_type').defaultTo('local'); // 'local' or 'gcs'
      });
      console.log('✅ Added storage_type column');
    } else {
      console.log('✅ storage_type column already exists');
    }

    console.log('✅ All required columns added successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

addUploadColumns();
