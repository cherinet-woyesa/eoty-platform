/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if video_url column already exists in videos table
  const hasVideoUrl = await knex.schema.hasColumn('videos', 'video_url');
  
  if (!hasVideoUrl) {
    await knex.schema.alterTable('videos', (table) => {
      table.text('video_url').nullable(); // Changed to TEXT for long URLs
    });
    console.log('✅ Added video_url column (as TEXT) to videos table');
  } else {
    // If it exists but is varchar(255), alter it to TEXT
    const columnInfo = await knex('information_schema.columns')
      .where({
        table_name: 'videos',
        column_name: 'video_url'
      })
      .select('data_type')
      .first();
    
    if (columnInfo && columnInfo.data_type === 'character varying') {
      await knex.raw('ALTER TABLE videos ALTER COLUMN video_url TYPE TEXT');
      console.log('✅ Changed video_url column from VARCHAR to TEXT');
    } else {
      console.log('ℹ️ video_url column already exists as TEXT in videos table');
    }
  }

  // Also check if we need to add it to lessons table
  const hasLessonVideoUrl = await knex.schema.hasColumn('lessons', 'video_url');
  
  if (!hasLessonVideoUrl) {
    await knex.schema.alterTable('lessons', (table) => {
      table.text('video_url').nullable(); // TEXT for long URLs
    });
    console.log('✅ Added video_url column (as TEXT) to lessons table');
  } else {
    // Check and alter lessons table too if needed
    const lessonColumnInfo = await knex('information_schema.columns')
      .where({
        table_name: 'lessons',
        column_name: 'video_url'
      })
      .select('data_type')
      .first();
    
    if (lessonColumnInfo && lessonColumnInfo.data_type === 'character varying') {
      await knex.raw('ALTER TABLE lessons ALTER COLUMN video_url TYPE TEXT');
      console.log('✅ Changed video_url column from VARCHAR to TEXT in lessons table');
    } else {
      console.log('ℹ️ video_url column already exists as TEXT in lessons table');
    }
  }
};

exports.down = async function(knex) {
  // Remove the columns if they exist
  const hasVideoUrl = await knex.schema.hasColumn('videos', 'video_url');
  const hasLessonVideoUrl = await knex.schema.hasColumn('lessons', 'video_url');
  
  if (hasVideoUrl) {
    await knex.schema.alterTable('videos', (table) => {
      table.dropColumn('video_url');
    });
  }
  
  if (hasLessonVideoUrl) {
    await knex.schema.alterTable('lessons', (table) => {
      table.dropColumn('video_url');
    });
  }
};