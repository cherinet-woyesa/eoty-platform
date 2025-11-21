const db = require('./backend/config/database');

async function migrateApprovedContent() {
  try {
    console.log('🔄 Checking for approved content to migrate...');

    // Check if content_uploads table exists
    const uploadsTableExists = await db.schema.hasTable('content_uploads');
    if (!uploadsTableExists) {
      console.log('❌ content_uploads table does not exist');
      return;
    }

    // Get approved uploads that aren't already in resources
    const approvedUploads = await db('content_uploads')
      .where({ status: 'approved' })
      .select('*');

    console.log(`📊 Found ${approvedUploads.length} approved uploads`);

    if (approvedUploads.length === 0) {
      console.log('✅ No approved content to migrate');
      return;
    }

    let migrated = 0;
    for (const upload of approvedUploads) {
      try {
        // Check if already exists in resources (by file_path to avoid duplicates)
        const existing = await db('resources')
          .where({ file_path: upload.file_path })
          .first();

        if (existing) {
          console.log(`⏭️  Already exists: ${upload.title}`);
          continue;
        }

        // Insert into resources
        await db('resources').insert({
          title: upload.title,
          description: upload.description,
          author: upload.metadata?.author || 'Unknown',
          category: upload.category || 'General',
          file_name: upload.file_name,
          file_type: upload.file_type,
          file_path: upload.file_path,
          file_size: upload.file_size,
          file_url: `/uploads/resources/${upload.file_name}`,
          language: upload.metadata?.language || 'english',
          tags: upload.tags ? JSON.stringify(upload.tags) : JSON.stringify([]),
          is_public: true,
          chapter_id: upload.chapter_id,
          published_at: upload.created_at,
          published_date: upload.created_at,
          created_at: upload.created_at,
          updated_at: upload.updated_at
        });

        migrated++;
        console.log(`✅ Migrated: ${upload.title}`);
      } catch (error) {
        console.error(`❌ Failed to migrate ${upload.title}:`, error.message);
      }
    }

    const finalCount = await db('resources').count('* as count').first();
    console.log(`✅ Migration complete: ${migrated} items migrated`);
    console.log(`📊 Total resources in library: ${finalCount?.count || 0}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateApprovedContent();


