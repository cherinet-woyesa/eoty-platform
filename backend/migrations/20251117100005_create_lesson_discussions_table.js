/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('lesson_discussions');
  if (hasTable) {
    console.log('✓ lesson_discussions table already exists, skipping migration');
    return;
  }

  // Create lesson_discussions table
  await knex.schema.createTable('lesson_discussions', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().notNullable()
      .references('id').inTable('lessons').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('parent_id').unsigned()
      .references('id').inTable('lesson_discussions').onDelete('CASCADE');
    table.text('content').notNullable();
    table.boolean('is_flagged').defaultTo(false);
    table.boolean('is_hidden').defaultTo(false);
    table.text('flag_reason');
    table.integer('flagged_by').unsigned()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('flagged_at');
    table.integer('moderated_by').unsigned()
      .references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('moderated_at');
    table.timestamps(true, true);
    
    // Indexes
    table.index(['lesson_id'], 'idx_discussions_lesson');
    table.index(['user_id'], 'idx_discussions_user');
    table.index(['parent_id'], 'idx_discussions_parent');
    table.index(['created_at'], 'idx_discussions_created_at');
  });

  // Add partial index for flagged content
  await knex.raw('CREATE INDEX idx_discussions_flagged ON lesson_discussions(is_flagged) WHERE is_flagged = true');

  // Add CHECK constraint for content length (1-5000 characters)
  await knex.raw('ALTER TABLE lesson_discussions ADD CONSTRAINT valid_content CHECK (LENGTH(content) > 0 AND LENGTH(content) <= 5000)');

  console.log('✓ Created lesson_discussions table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('lesson_discussions');
  console.log('✓ Dropped lesson_discussions table');
};
