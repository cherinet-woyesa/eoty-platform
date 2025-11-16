/**
 * Script to create content_uploads and content_quotas tables directly
 * This bypasses migration issues and creates the tables needed for uploads
 */

const db = require('../config/database');

async function createContentTables() {
  try {
    console.log('Creating content_uploads table...');
    
    // Check if table already exists
    const uploadsExists = await db.schema.hasTable('content_uploads');
    if (!uploadsExists) {
      await db.schema.createTable('content_uploads', (table) => {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.text('description');
        table.string('file_name').notNullable();
        table.string('file_type').notNullable(); // video, document, image, audio
        table.string('file_path').notNullable();
        table.string('file_size');
        table.string('mime_type');
        table.string('uploaded_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.integer('chapter_id').unsigned().notNullable().references('id').inTable('chapters').onDelete('CASCADE');
        table.jsonb('tags');
        table.string('category');
        table.string('status').defaultTo('pending'); // pending, approved, rejected, processing, draft
        table.text('rejection_reason');
        table.string('approved_by').references('id').inTable('users').onDelete('SET NULL');
        table.timestamp('approved_at');
        table.jsonb('metadata'); // Processing info, preview data, thumbnails, etc.
        table.integer('version').defaultTo(1);
        table.integer('parent_version_id').unsigned().references('id').inTable('content_uploads');
        table.boolean('is_latest').defaultTo(true);
        table.timestamps(true, true);
        
        table.index(['chapter_id', 'status']);
        table.index(['file_type', 'created_at']);
        table.index(['uploaded_by', 'status']);
        table.index(['status', 'created_at']);
      });
      console.log('✅ content_uploads table created');
    } else {
      console.log('⚠️  content_uploads table already exists');
    }

    console.log('Creating content_quotas table...');
    
    // Check if table already exists
    const quotasExists = await db.schema.hasTable('content_quotas');
    if (!quotasExists) {
      await db.schema.createTable('content_quotas', (table) => {
        table.increments('id').primary();
        table.integer('chapter_id').unsigned().notNullable().references('id').inTable('chapters').onDelete('CASCADE');
        table.string('content_type').notNullable(); // video, document, image, audio
        table.integer('monthly_limit').defaultTo(0); // 0 = unlimited
        table.integer('current_usage').defaultTo(0);
        table.date('period_start').notNullable(); // Start of quota period (usually first day of month)
        table.date('period_end').notNullable(); // End of quota period (usually last day of month)
        table.timestamps(true, true);
        
        // Unique constraint: one quota per chapter, content type, and period
        table.unique(['chapter_id', 'content_type', 'period_start', 'period_end']);
        table.index(['chapter_id', 'content_type']);
        table.index(['period_start', 'period_end']);
      });
      console.log('✅ content_quotas table created');
    } else {
      console.log('⚠️  content_quotas table already exists');
    }

    console.log('✅ All content tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createContentTables();

