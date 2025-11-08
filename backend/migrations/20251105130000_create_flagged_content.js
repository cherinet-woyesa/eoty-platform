/**
 * Migration: Create flagged_content table
 * This table is referenced by the admin dashboard but was missing
 */

exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('flagged_content');
  
  if (!hasTable) {
    await knex.schema.createTable('flagged_content', function(table) {
      table.increments('id').primary();
      table.string('content_type', 50).notNullable(); // 'course', 'lesson', 'comment', etc.
      table.integer('content_id').notNullable();
      table.integer('flagged_by').unsigned().notNullable(); // Match users.id type (integer)
      table.string('flag_reason', 100).notNullable();
      table.text('description');
      table.string('status', 20).notNullable().defaultTo('pending'); // 'pending', 'reviewed', 'resolved', 'dismissed'
      table.integer('reviewed_by').unsigned(); // Match users.id type (integer)
      table.text('review_notes');
      table.string('action_taken', 50);
      table.timestamp('reviewed_at');
      table.timestamps(true, true);
      
      // Foreign keys - users.id is text type
      table.foreign('flagged_by').references('id').inTable('users').onDelete('CASCADE');
      table.foreign('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
      
      // Indexes
      table.index(['status'], 'idx_flagged_content_status');
      table.index(['content_type', 'content_id'], 'idx_flagged_content_content');
      table.index(['flagged_by'], 'idx_flagged_content_flagger');
      table.index(['created_at'], 'idx_flagged_content_created');
    });
    
    console.log('✓ Created flagged_content table');
  } else {
    console.log('✓ flagged_content table already exists');
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('flagged_content');
  console.log('✓ Dropped flagged_content table');
};
