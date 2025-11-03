/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Language Usage Tracking
  await knex.schema.createTable('language_usage_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('detected_language', 10).notNullable();
    table.text('input_text');
    table.decimal('confidence', 3, 2);
    table.string('context'); // forum, chat, search, etc.
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'timestamp']);
    table.index(['detected_language', 'timestamp']);
    table.index(['context', 'timestamp']);
  });

  // Translation Logs
  await knex.schema.createTable('translation_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('source_language', 10).notNullable();
    table.string('target_language', 10).notNullable();
    table.text('original_text');
    table.text('translated_text');
    table.string('translation_quality', 20); // good, acceptable, poor
    table.decimal('confidence', 3, 2);
    table.string('translation_engine');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['source_language', 'target_language', 'timestamp']);
    table.index(['user_id', 'timestamp']);
  });

  // Unsupported Language Logs
  await knex.schema.createTable('unsupported_language_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('session_id', 255).notNullable();
    table.string('detected_language', 10).notNullable();
    table.text('input_text').notNullable();
    table.string('context');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    
    table.index(['user_id', 'timestamp']);
    table.index(['detected_language', 'timestamp']);
  });

  // Content Translations
  await knex.schema.createTable('content_translations', (table) => {
    table.increments('id').primary();
    table.string('content_type').notNullable(); // course, lesson, resource, etc.
    table.integer('content_id').notNullable();
    table.string('language', 10).notNullable();
    table.string('field_name').notNullable(); // title, description, content, etc.
    table.text('translated_text').notNullable();
    table.string('translation_status').defaultTo('pending'); // pending, approved, rejected
    table.integer('translated_by').unsigned().references('id').inTable('users');
    table.integer('reviewed_by').unsigned().references('id').inTable('users');
    table.timestamp('reviewed_at');
    table.decimal('quality_score', 3, 2);
    table.jsonb('translation_metadata');
    table.timestamps(true, true);
    
    table.unique(['content_type', 'content_id', 'language', 'field_name']);
    table.index(['content_type', 'content_id']);
    table.index(['language', 'translation_status']);
  });

  // Multilingual Resources
  await knex.schema.createTable('multilingual_resources', (table) => {
    table.increments('id').primary();
    table.integer('resource_id').unsigned().references('id').inTable('resources').onDelete('CASCADE');
    table.string('language', 10).notNullable();
    table.string('title').notNullable();
    table.text('description');
    table.text('translated_content');
    table.string('translation_status').defaultTo('pending');
    table.integer('translated_by').unsigned().references('id').inTable('users');
    table.decimal('translation_quality', 3, 2);
    table.jsonb('translation_metadata');
    table.timestamps(true, true);
    
    table.unique(['resource_id', 'language']);
    table.index(['resource_id']);
    table.index(['language', 'translation_status']);
  });

  // Language Preferences
  await knex.schema.createTable('language_preferences', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('preferred_language', 10).notNullable().defaultTo('en');
    table.string('ui_language', 10).defaultTo('en');
    table.string('content_language', 10).defaultTo('en');
    table.boolean('auto_translate').defaultTo(true);
    table.jsonb('language_skills'); // {en: 'fluent', am: 'native', etc.}
    table.timestamps(true, true);
    
    table.unique(['user_id']);
    table.index(['preferred_language']);
  });

  // Translation Memory
  await knex.schema.createTable('translation_memory', (table) => {
    table.increments('id').primary();
    table.string('source_language', 10).notNullable();
    table.string('target_language', 10).notNullable();
    table.text('source_text').notNullable();
    table.text('target_text').notNullable();
    table.string('domain'); // religious, educational, general, etc.
    table.integer('usage_count').defaultTo(0);
    table.decimal('confidence', 3, 2).defaultTo(1.0);
    table.integer('added_by').unsigned().references('id').inTable('users');
    table.timestamp('last_used_at');
    table.timestamps(true, true);
    
    table.index(['source_language', 'target_language']);
    table.index(['domain', 'usage_count']);
    table.index(['source_text'], null, { indexType: 'FULLTEXT' });
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('translation_memory');
  await knex.schema.dropTableIfExists('language_preferences');
  await knex.schema.dropTableIfExists('multilingual_resources');
  await knex.schema.dropTableIfExists('content_translations');
  await knex.schema.dropTableIfExists('unsupported_language_logs');
  await knex.schema.dropTableIfExists('translation_logs');
  await knex.schema.dropTableIfExists('language_usage_logs');
};