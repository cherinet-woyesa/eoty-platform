/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('flagged_content');
  if (hasTable) {
    console.log('flagged_content table already exists, skipping creation');
    return;
  }

  await knex.schema.createTable('flagged_content', (table) => {
    table.increments('id').primary();
    table.string('content_type', 50).notNullable(); // e.g., 'post', 'comment', 'question', 'resource'
    table.integer('content_id').notNullable(); // ID of the flagged content
    table.string('flagged_by', 255).notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('reviewed_by', 255).nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('status', 50).notNullable().defaultTo('pending'); // pending, approved, rejected, dismissed
    table.string('flag_reason', 255).notNullable(); // e.g., 'inappropriate', 'spam', 'doctrinal_issue'
    table.text('flag_details').nullable(); // Additional details about the flag
    table.text('review_notes').nullable(); // Notes from the reviewer
    table.string('action_taken', 255).nullable(); // e.g., 'removed', 'edited', 'warned_user'
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('reviewed_at').nullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index('status');
    table.index('content_type');
    table.index('content_id');
    table.index('flagged_by');
    table.index('created_at');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('flagged_content');
};

