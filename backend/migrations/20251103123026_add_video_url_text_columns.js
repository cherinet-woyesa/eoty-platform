/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Fix videos table - change video_url to TEXT if it exists as VARCHAR
  const hasVideoUrl = await knex.schema.hasColumn('videos', 'video_url');
  
  if (hasVideoUrl) {
    // Check current data type
    const columnInfo = await knex('information_schema.columns')
      .where({
        table_schema: 'public',
        table_name: 'videos',
        column_name: 'video_url'
      })
      .select('data_type', 'character_maximum_length')
      .first();
    
    if (columnInfo && columnInfo.data_type === 'character varying') {
      await knex.raw('ALTER TABLE videos ALTER COLUMN video_url TYPE TEXT');
      console.log('✅ Changed videos.video_url from VARCHAR to TEXT');
    } else {
      console.log('ℹ️ videos.video_url is already TEXT');
    }
  } else {
    // Add video_url as TEXT if it doesn't exist
    await knex.schema.alterTable('videos', (table) => {
      table.text('video_url').nullable();
    });
    console.log('✅ Added video_url (TEXT) to videos table');
  }

  // Fix lessons table - change video_url to TEXT if it exists as VARCHAR
  const hasLessonVideoUrl = await knex.schema.hasColumn('lessons', 'video_url');
  
  if (hasLessonVideoUrl) {
    // Check current data type
    const lessonColumnInfo = await knex('information_schema.columns')
      .where({
        table_schema: 'public',
        table_name: 'lessons',
        column_name: 'video_url'
      })
      .select('data_type', 'character_maximum_length')
      .first();
    
    if (lessonColumnInfo && lessonColumnInfo.data_type === 'character varying') {
      await knex.raw('ALTER TABLE lessons ALTER COLUMN video_url TYPE TEXT');
      console.log('✅ Changed lessons.video_url from VARCHAR to TEXT');
    } else {
      console.log('ℹ️ lessons.video_url is already TEXT');
    }
  } else {
    // Add video_url as TEXT if it doesn't exist
    await knex.schema.alterTable('lessons', (table) => {
      table.text('video_url').nullable();
    });
    console.log('✅ Added video_url (TEXT) to lessons table');
  }

  // Also ensure storage_url is TEXT in videos table (it should be already)
  const hasStorageUrl = await knex.schema.hasColumn('videos', 'storage_url');
  if (hasStorageUrl) {
    const storageUrlInfo = await knex('information_schema.columns')
      .where({
        table_schema: 'public',
        table_name: 'videos',
        column_name: 'storage_url'
      })
      .select('data_type')
      .first();
    
    if (storageUrlInfo && storageUrlInfo.data_type === 'character varying') {
      await knex.raw('ALTER TABLE videos ALTER COLUMN storage_url TYPE TEXT');
      console.log('✅ Changed videos.storage_url from VARCHAR to TEXT');
    }
  }
};

exports.down = async function(knex) {
  // We won't implement down for this fix migration
  console.log('⚠️  No down migration for this fix');
};