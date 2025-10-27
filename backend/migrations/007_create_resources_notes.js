exports.up = async function(knex) {
  // Resources table
  await knex.schema.createTable('resources', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('file_name').notNullable();
    table.string('file_type').notNullable(); // pdf, text, image, video
    table.string('file_path').notNullable();
    table.string('file_size');
    table.string('author');
    table.string('category'); // scripture, theology, history, etc.
    table.string('language').defaultTo('amharic');
    table.string('chapter_id').notNullable();
    table.json('tags'); // Array of tags
    table.boolean('is_public').defaultTo(false);
    table.boolean('requires_permission').defaultTo(false);
    table.integer('uploaded_by').unsigned().notNullable();
    table.timestamp('published_at');
    table.timestamps(true, true);
    
    table.foreign('uploaded_by').references('id').inTable('users');
    table.index(['category', 'language']);
    table.index('chapter_id');
  });

  // Resource permissions table
  await knex.schema.createTable('resource_permissions', (table) => {
    table.increments('id').primary();
    table.integer('resource_id').unsigned().notNullable();
    table.string('role'); // Specific role or 'all'
    table.string('permission_type').defaultTo('view'); // view, download, annotate
    table.timestamps(true, true);
    
    table.foreign('resource_id').references('id').inTable('resources').onDelete('CASCADE');
    table.unique(['resource_id', 'role', 'permission_type']);
  });

  // User notes table
  await knex.schema.createTable('user_notes', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('resource_id').unsigned().notNullable();
    table.string('anchor_point'); // Section, page, timestamp
    table.text('content').notNullable();
    table.boolean('is_public').defaultTo(false);
    table.json('metadata'); // Position, color, etc.
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('resource_id').references('id').inTable('resources').onDelete('CASCADE');
    table.index(['resource_id', 'user_id']);
  });

  // AI summaries table
  await knex.schema.createTable('ai_summaries', (table) => {
    table.increments('id').primary();
    table.integer('resource_id').unsigned().notNullable();
    table.text('summary').notNullable();
    table.text('key_points'); // JSON array
    table.text('spiritual_insights');
    table.string('summary_type'); // brief, detailed, key_points
    table.integer('word_count');
    table.decimal('relevance_score', 3, 2); // 0.00 to 1.00
    table.string('model_used');
    table.timestamps(true, true);
    
    table.foreign('resource_id').references('id').inTable('resources').onDelete('CASCADE');
    table.unique(['resource_id', 'summary_type']);
  });

  // Resource usage analytics
  await knex.schema.createTable('resource_usage', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('resource_id').unsigned().notNullable();
    table.string('action'); // view, download, share, note, summary
    table.json('metadata');
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('resource_id').references('id').inTable('resources').onDelete('CASCADE');
    table.index(['resource_id', 'action']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('resource_usage');
  await knex.schema.dropTable('ai_summaries');
  await knex.schema.dropTable('user_notes');
  await knex.schema.dropTable('resource_permissions');
  await knex.schema.dropTable('resources');
};