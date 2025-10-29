/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Resources table
  await knex.schema.createTable('resources', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('file_url');
    table.string('file_name');
    table.string('file_path');
    table.string('file_type');
    table.string('file_size');
    table.string('mime_type');
    table.string('author');
    table.string('category');
    table.string('language').defaultTo('amharic');
    table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('SET NULL');
    table.integer('uploaded_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.boolean('is_public').defaultTo(false);
    table.boolean('requires_permission').defaultTo(false);
    table.jsonb('tags');
    table.timestamp('published_at');
    table.timestamps(true, true);
    table.index(['category', 'language']);
    table.index('chapter_id');
  });

  // Resource permissions
  await knex.schema.createTable('resource_permissions', (table) => {
    table.increments('id').primary();
    table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
    table.string('role');
    table.string('permission_type').defaultTo('view');
    table.timestamps(true, true);
    table.unique(['resource_id', 'role', 'permission_type']);
  });

  // User notes for resources
  await knex.schema.createTable('user_notes', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
    table.string('anchor_point');
    table.text('content').notNullable();
    table.boolean('is_public').defaultTo(false);
    table.jsonb('metadata');
    table.timestamps(true, true);
    table.index(['resource_id', 'user_id']);
  });

  // AI summaries
  await knex.schema.createTable('ai_summaries', (table) => {
    table.increments('id').primary();
    table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
    table.text('summary').notNullable();
    table.jsonb('key_points');
    table.text('spiritual_insights');
    table.string('summary_type');
    table.integer('word_count');
    table.decimal('relevance_score', 3, 2);
    table.string('model_used');
    table.timestamps(true, true);
    table.unique(['resource_id', 'summary_type']);
  });

  // Resource usage analytics
  await knex.schema.createTable('resource_usage', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
    table.string('action');
    table.jsonb('metadata');
    table.timestamps(true, true);
    table.index(['resource_id', 'action']);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('resource_usage');
  await knex.schema.dropTableIfExists('ai_summaries');
  await knex.schema.dropTableIfExists('user_notes');
  await knex.schema.dropTableIfExists('resource_permissions');
  await knex.schema.dropTableIfExists('resources');
};