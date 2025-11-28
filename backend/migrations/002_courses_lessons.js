// Placeholder migration (no-op)
exports.up = function(knex) {
  return knex.schema
    .createTable('videos', function(table) {
      table.increments('id').primary();
      table.string('s3_key').nullable();
      table.string('video_url').nullable();
      table.string('hls_url').nullable();
      table.string('status').defaultTo('processing');
      table.integer('processing_progress').defaultTo(0);
      table.text('error_message').nullable();
      table.bigInteger('size_bytes').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('courses', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description').nullable();
      table.string('category').notNullable();
      table.string('level').nullable();
      table.string('cover_image').nullable();
      table.integer('created_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
      table.boolean('is_published').defaultTo(false);
      table.timestamp('published_at').nullable();
      table.timestamp('scheduled_publish_at').nullable();
      table.jsonb('metadata').defaultTo('{}');
      table.decimal('price', 10, 2).defaultTo(0);
      table.boolean('is_public').defaultTo(true);
      table.boolean('certification_available').defaultTo(false);
      table.text('welcome_message').nullable();
      table.string('status').defaultTo('draft');
      table.timestamps(true, true);
    })
    .createTable('lessons', function(table) {
      table.increments('id').primary();
      table.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('description').nullable();
      table.integer('order').defaultTo(0);
      table.integer('duration').defaultTo(0);
      table.string('video_url').nullable();
      table.string('thumbnail_url').nullable();
      table.boolean('is_published').defaultTo(false);
      table.timestamp('published_at').nullable();
      table.jsonb('resources').defaultTo('[]');
      table.jsonb('metadata').defaultTo('{}');
      table.boolean('allow_download').defaultTo(false);
      table.integer('video_id').unsigned().nullable().references('id').inTable('videos').onDelete('SET NULL');
      // Mux fields
      table.string('mux_upload_id').nullable();
      table.string('mux_asset_id').nullable();
      table.string('mux_playback_id').nullable();
      table.string('video_provider').nullable();
      table.string('mux_status').nullable();
      table.text('mux_error_message').nullable();
      table.timestamp('mux_created_at').nullable();
      
      table.integer('created_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
      table.timestamps(true, true);
    })
    .createTable('course_favorites', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
      table.timestamp('favorited_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'course_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('course_favorites')
    .dropTableIfExists('lessons')
    .dropTableIfExists('courses')
    .dropTableIfExists('videos');
};
