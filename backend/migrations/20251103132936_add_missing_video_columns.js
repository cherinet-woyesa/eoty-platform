/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Add missing columns to videos table
  const missingColumns = [
    { name: 'hls_url', type: 'text', nullable: true },
    { name: 'processing_error', type: 'text', nullable: true },
    { name: 'processing_attempts', type: 'integer', default: 0 },
    { name: 'processing_started_at', type: 'timestamp', nullable: true },
    { name: 'processing_completed_at', type: 'timestamp', nullable: true },
    { name: 'duration_seconds', type: 'integer', nullable: true },
    { name: 'width', type: 'integer', nullable: true },
    { name: 'height', type: 'integer', nullable: true },
    { name: 'codec', type: 'string', nullable: true },
    { name: 'thumbnail_url', type: 'text', nullable: true },
    { name: 'processing_metadata', type: 'jsonb', nullable: true },
    { name: 'last_processed_at', type: 'timestamp', nullable: true }
  ];

  for (const column of missingColumns) {
    const exists = await knex.schema.hasColumn('videos', column.name);
    
    if (!exists) {
      await knex.schema.alterTable('videos', (table) => {
        switch (column.type) {
          case 'text':
            table.text(column.name).nullable();
            break;
          case 'integer':
            table.integer(column.name).nullable().defaultTo(column.default);
            break;
          case 'string':
            table.string(column.name).nullable();
            break;
          case 'timestamp':
            table.timestamp(column.name).nullable();
            break;
          case 'jsonb':
            table.jsonb(column.name).nullable();
            break;
        }
      });
      console.log(`✅ Added ${column.name} to videos table`);
    } else {
      console.log(`ℹ️ ${column.name} already exists in videos table`);
    }
  }

  // Also ensure video_url is TEXT in both tables
  const tables = ['videos', 'lessons'];
  
  for (const tableName of tables) {
    const hasVideoUrl = await knex.schema.hasColumn(tableName, 'video_url');
    
    if (hasVideoUrl) {
      const columnInfo = await knex('information_schema.columns')
        .where({
          table_schema: 'public',
          table_name: tableName,
          column_name: 'video_url'
        })
        .select('data_type')
        .first();
      
      if (columnInfo && columnInfo.data_type === 'character varying') {
        await knex.raw(`ALTER TABLE ${tableName} ALTER COLUMN video_url TYPE TEXT`);
        console.log(`✅ Changed ${tableName}.video_url from VARCHAR to TEXT`);
      }
    } else {
      await knex.schema.alterTable(tableName, (table) => {
        table.text('video_url').nullable();
      });
      console.log(`✅ Added video_url (TEXT) to ${tableName} table`);
    }
  }
};

exports.down = async function(knex) {
  // We won't implement down for this fix migration
  console.log('⚠️  No down migration for this fix');
};