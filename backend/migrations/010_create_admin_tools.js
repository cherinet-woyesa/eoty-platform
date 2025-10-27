exports.up = async function(knex) {
  // Content upload queue table
  await knex.schema.createTable('content_uploads', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('file_name').notNullable();
    table.string('file_type').notNullable(); // video, document, image
    table.string('file_path').notNullable();
    table.string('file_size');
    table.string('mime_type');
    table.string('uploaded_by').notNullable(); // user_id or 'system'
    table.string('chapter_id').notNullable();
    table.json('tags'); // Array of tags
    table.string('category');
    table.string('status').defaultTo('pending'); // pending, approved, rejected, processing
    table.text('rejection_reason');
    table.integer('approved_by').unsigned();
    table.timestamp('approved_at');
    table.json('metadata'); // Processing info, preview data, etc.
    table.timestamps(true, true);
    
    table.foreign('approved_by').references('id').inTable('users');
    table.index(['chapter_id', 'status']);
    table.index(['file_type', 'created_at']);
  });

  // Content quotas table
  await knex.schema.createTable('content_quotas', (table) => {
    table.increments('id').primary();
    table.string('chapter_id').notNullable();
    table.string('content_type').notNullable(); // video, document, image
    table.integer('monthly_limit').defaultTo(0); // 0 = unlimited
    table.integer('current_usage').defaultTo(0);
    table.date('period_start').notNullable();
    table.date('period_end').notNullable();
    table.timestamps(true, true);
    
    table.unique(['chapter_id', 'content_type', 'period_start']);
    table.index(['chapter_id', 'content_type']);
  });

  // Flagged content table
  await knex.schema.createTable('flagged_content', (table) => {
    table.increments('id').primary();
    table.string('content_type').notNullable(); // forum_post, resource, user
    table.integer('content_id').notNullable();
    table.integer('flagged_by').unsigned().notNullable();
    table.string('flag_reason').notNullable(); // spam, inappropriate, copyright, other
    table.text('flag_details');
    table.string('status').defaultTo('pending'); // pending, reviewed, action_taken, dismissed
    table.integer('reviewed_by').unsigned();
    table.timestamp('reviewed_at');
    table.text('review_notes');
    table.string('action_taken'); // removed, edited, warned, banned
    table.timestamps(true, true);
    
    table.foreign('flagged_by').references('id').inTable('users');
    table.foreign('reviewed_by').references('id').inTable('users');
    table.index(['content_type', 'content_id']);
    table.index(['status', 'created_at']);
  });

  // Admin audit logs
  await knex.schema.createTable('admin_audit_logs', (table) => {
    table.increments('id').primary();
    table.integer('admin_id').unsigned().notNullable();
    table.string('action_type').notNullable(); // upload_approve, content_edit, user_ban, etc.
    table.string('target_type'); // user, content, forum, etc.
    table.integer('target_id');
    table.text('action_details');
    table.json('before_state');
    table.json('after_state');
    table.string('ip_address');
    table.string('user_agent');
    table.timestamps(true, true);
    
    table.foreign('admin_id').references('id').inTable('users');
    table.index(['admin_id', 'created_at']);
    table.index(['action_type', 'target_type']);
  });

  // Analytics snapshots
  await knex.schema.createTable('analytics_snapshots', (table) => {
    table.increments('id').primary();
    table.string('snapshot_type').notNullable(); // daily, weekly, monthly
    table.date('snapshot_date').notNullable();
    table.json('metrics'); // All computed metrics
    table.json('chapter_comparison'); // Cross-chapter analytics
    table.json('trends'); // Growth trends and patterns
    table.timestamps(true, true);
    
    table.unique(['snapshot_type', 'snapshot_date']);
    table.index(['snapshot_date']);
  });

  // User moderation actions
  await knex.schema.createTable('user_moderation', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.string('action_type').notNullable(); // warn, suspend, ban
    table.text('reason');
    table.integer('moderator_id').unsigned().notNullable();
    table.timestamp('action_until'); // For temporary actions
    table.boolean('is_active').defaultTo(true);
    table.json('metadata'); // Appeal info, notes, etc.
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('moderator_id').references('id').inTable('users');
    table.index(['user_id', 'is_active']);
  });

  // Content tagging system
  await knex.schema.createTable('content_tags', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('category'); // theological, educational, practical, etc.
    table.string('color').defaultTo('#6B7280'); // Tag color for UI
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by').unsigned().notNullable();
    table.timestamps(true, true);
    
    table.foreign('created_by').references('id').inTable('users');
    table.unique('name');
  });

  // Content-tag relationships
  await knex.schema.createTable('content_tag_relationships', (table) => {
    table.increments('id').primary();
    table.string('content_type').notNullable(); // resource, course, forum_topic
    table.integer('content_id').notNullable();
    table.integer('tag_id').unsigned().notNullable();
    table.integer('tagged_by').unsigned().notNullable();
    table.timestamps(true, true);
    
    table.foreign('tag_id').references('id').inTable('content_tags');
    table.foreign('tagged_by').references('id').inTable('users');
    table.unique(['content_type', 'content_id', 'tag_id']);
    table.index(['tag_id', 'content_type']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('content_tag_relationships');
  await knex.schema.dropTable('content_tags');
  await knex.schema.dropTable('user_moderation');
  await knex.schema.dropTable('analytics_snapshots');
  await knex.schema.dropTable('admin_audit_logs');
  await knex.schema.dropTable('flagged_content');
  await knex.schema.dropTable('content_quotas');
  await knex.schema.dropTable('content_uploads');
};