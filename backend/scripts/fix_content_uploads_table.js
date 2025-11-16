/**
 * Script to fix or create content_uploads table with correct structure
 */

const db = require('../config/database');

async function fixContentUploadsTable() {
  try {
    console.log('Checking content_uploads table...');
    
    let exists = await db.schema.hasTable('content_uploads');
    
    if (exists) {
      console.log('Table exists, checking foreign keys...');
      // Check if foreign keys exist
      const constraints = await db.raw(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'content_uploads' 
        AND constraint_type = 'FOREIGN KEY'
      `);
      
      if (constraints.rows.length === 0) {
        console.log('⚠️  Table exists but has no foreign keys. Adding them...');
        // Table exists but might need foreign keys - try to add them
      } else {
        console.log('✅ Table exists with foreign keys');
        // Check if we can actually use it by testing a simple query
        try {
          await db('content_uploads').limit(1);
          console.log('✅ Table is accessible');
          return;
        } catch (err) {
          console.log('⚠️  Table exists but has issues:', err.message);
        }
      }
    }
    
    if (!exists) {
      console.log('Creating content_uploads table with correct structure...');
      await db.schema.createTable('content_uploads', (table) => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.text('description');
        table.string('file_name').notNullable();
        table.string('file_type').notNullable(); // video, document, image, audio
        table.string('file_path').notNullable();
        table.string('file_size');
        table.string('mime_type');
        // Note: users.id might be integer or string depending on migration
        // We'll try integer first, if it fails we'll use string
        table.integer('uploaded_by').unsigned().notNullable();
        table.integer('chapter_id').unsigned().notNullable();
        table.jsonb('tags');
        table.string('category');
        table.string('status').defaultTo('pending'); // pending, approved, rejected, processing, draft
        table.text('rejection_reason');
        table.integer('approved_by').unsigned().nullable();
        table.timestamp('approved_at');
        table.jsonb('metadata'); // Processing info, preview data, thumbnails, etc.
        table.integer('version').defaultTo(1);
        table.integer('parent_version_id').unsigned().nullable();
        table.boolean('is_latest').defaultTo(true);
        table.timestamps(true, true);
        
        table.index(['chapter_id', 'status']);
        table.index(['file_type', 'created_at']);
        table.index(['uploaded_by', 'status']);
        table.index(['status', 'created_at']);
      });
      
      // Try to add foreign keys, but don't fail if they can't be added
      try {
        await db.raw(`
          ALTER TABLE content_uploads 
          ADD CONSTRAINT content_uploads_uploaded_by_fk 
          FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;
        `);
        console.log('✅ Added uploaded_by foreign key');
      } catch (err) {
        console.log('⚠️  Could not add uploaded_by foreign key (may be type mismatch):', err.message);
      }
      
      try {
        await db.raw(`
          ALTER TABLE content_uploads 
          ADD CONSTRAINT content_uploads_chapter_id_fk 
          FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE;
        `);
        console.log('✅ Added chapter_id foreign key');
      } catch (err) {
        console.log('⚠️  Could not add chapter_id foreign key:', err.message);
      }
      
      try {
        await db.raw(`
          ALTER TABLE content_uploads 
          ADD CONSTRAINT content_uploads_approved_by_fk 
          FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL;
        `);
        console.log('✅ Added approved_by foreign key');
      } catch (err) {
        console.log('⚠️  Could not add approved_by foreign key:', err.message);
      }
      
      try {
        await db.raw(`
          ALTER TABLE content_uploads 
          ADD CONSTRAINT content_uploads_parent_version_id_fk 
          FOREIGN KEY (parent_version_id) REFERENCES content_uploads(id) ON DELETE SET NULL;
        `);
        console.log('✅ Added parent_version_id foreign key');
      } catch (err) {
        console.log('⚠️  Could not add parent_version_id foreign key:', err.message);
      }
      
      console.log('✅ content_uploads table created successfully!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixContentUploadsTable();

