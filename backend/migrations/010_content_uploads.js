/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Content uploads with approval workflow
  await knex.schema.createTable('content_uploads', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('file_name').notNullable();
    table.string('file_type').notNullable(); // video, document, image, audio
    table.string('file_path').notNullable();
    table.string('file_size');
    table.string('mime_type');
    table.integer('uploaded_by').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('chapter_id').notNullable();
    table.jsonb('tags');
    table.string('category');
    table.string('status').defaultTo('pending'); // pending, approved, rejected, processing, draft
    table.text('rejection_reason');
    table.integer('approved_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('approved_at');
    table.jsonb('metadata'); // Processing info, preview data, thumbnails, etc.
    table.integer('version').defaultTo(1);
    table.integer('parent_version_id').unsigned().references('id').inTable('content_uploads');
    table.boolean('is_latest').defaultTo(true);
    table.timestamps(true, true);
    
    table.index(['chapter_id', 'status']);
    table.index(['file_type', 'created_at']);
    table.index(['uploaded_by', 'status']);
    table.index(['status', 'created_at']);
  });

  // Content review queue for moderators
  await knex.schema.createTable('content_review_queue', (table) => {
    table.increments('id').primary();
    table.integer('content_id').unsigned().notNullable().references('id').inTable('content_uploads').onDelete('CASCADE');
    table.integer('assigned_to').unsigned().references('id').inTable('users').onDelete('SET NULL');
    table.string('priority').defaultTo('normal'); // low, normal, high, critical
    table.string('status').defaultTo('pending'); // pending, in_review, approved, rejected
    table.text('review_notes');
    table.jsonb('review_criteria'); // Faith alignment, quality, relevance, etc.
    table.timestamp('assigned_at');
    table.timestamp('reviewed_at');
    table.timestamps(true, true);
    
    table.index(['status', 'priority']);
    table.index(['assigned_to', 'status']);
    table.index(['content_id']);
  });

  // Content usage statistics
  await knex.schema.createTable('content_usage_stats', (table) => {
    table.increments('id').primary();
    table.integer('content_id').unsigned().notNullable().references('id').inTable('content_uploads').onDelete('CASCADE');
    table.integer('view_count').defaultTo(0);
    table.integer('download_count').defaultTo(0);
    table.integer('share_count').defaultTo(0);
    table.integer('favorite_count').defaultTo(0);
    table.decimal('average_rating', 3, 2).defaultTo(0);
    table.integer('rating_count').defaultTo(0);
    table.jsonb('engagement_metrics'); // Time spent, completion rates, etc.
    table.timestamp('last_accessed_at');
    table.timestamps(true, true);
    
    table.unique(['content_id']);
    table.index(['view_count', 'created_at']);
    table.index(['average_rating', 'rating_count']);
  });

  // Content ratings and reviews
  await knex.schema.createTable('content_ratings', (table) => {
    table.increments('id').primary();
    table.integer('content_id').unsigned().notNullable().references('id').inTable('content_uploads').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('rating').notNullable(); // 1-5 stars
    table.text('review');
    table.boolean('is_verified').defaultTo(false); // User actually consumed the content
    table.jsonb('helpful_votes'); // { helpful: 0, not_helpful: 0 }
    table.timestamps(true, true);
    
    table.unique(['content_id', 'user_id']);
    table.index(['content_id', 'rating']);
    table.index(['user_id', 'created_at']);
  });

  // Content favorites
  await knex.schema.createTable('content_favorites', (table) => {
    table.increments('id').primary();
    table.integer('content_id').unsigned().notNullable().references('id').inTable('content_uploads').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('favorited_at').defaultTo(knex.fn.now());
    table.jsonb('tags'); // User-defined tags for organization
    
    table.unique(['content_id', 'user_id']);
    table.index(['user_id', 'favorited_at']);
    table.index(['content_id']);
  });

  // Content sharing
  await knex.schema.createTable('content_shares', (table) => {
    table.increments('id').primary();
    table.integer('content_id').unsigned().notNullable().references('id').inTable('content_uploads').onDelete('CASCADE');
    table.integer('shared_by').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('share_method'); // email, link, social_media, etc.
    table.string('shared_with'); // Email, user_id, or platform
    table.text('share_message');
    table.timestamp('shared_at').defaultTo(knex.fn.now());
    table.jsonb('share_metadata');
    
    table.index(['content_id', 'shared_at']);
    table.index(['shared_by', 'shared_at']);
    table.index(['share_method']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('content_shares');
  await knex.schema.dropTableIfExists('content_favorites');
  await knex.schema.dropTableIfExists('content_ratings');
  await knex.schema.dropTableIfExists('content_usage_stats');
  await knex.schema.dropTableIfExists('content_review_queue');
  await knex.schema.dropTableIfExists('content_uploads');
};