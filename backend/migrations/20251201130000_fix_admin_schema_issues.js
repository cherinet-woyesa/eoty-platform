/**
 * Fix admin schema issues
 */
exports.up = function(knex) {
  return knex.schema
    // 1. Create moderated_content table
    .createTable('moderated_content', function(table) {
      table.increments('id').primary();
      table.string('content_type').notNullable(); // 'comment', 'post', 'video'
      table.integer('content_id').notNullable();
      table.text('content_text');
      table.string('author_id');
      table.string('status').defaultTo('pending'); // 'pending', 'approved', 'rejected'
      table.jsonb('ai_analysis'); // Store AI confidence scores, flags
      table.string('flagged_reason');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    // 2. Create abnormal_activity_alerts table
    .createTable('abnormal_activity_alerts', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('type').notNullable(); // 'login_failure', 'geo_mismatch', etc.
      table.string('severity').defaultTo('medium'); // 'low', 'medium', 'high', 'critical'
      table.text('description');
      table.jsonb('metadata'); // IP, location, etc.
      table.boolean('is_resolved').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('resolved_at');
    })
    // 3. Add category column to content_tags if it doesn't exist
    .table('content_tags', function(table) {
      table.string('category').defaultTo('general');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('moderated_content')
    .dropTableIfExists('abnormal_activity_alerts')
    .table('content_tags', function(table) {
      table.dropColumn('category');
    });
};
