/**
 * Migration: Create video_notes table
 * for storing user notes and bookmarks at specific video timestamps
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('video_notes', function(table) {
    table.increments('id').primary();
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().notNullable().references('id').inTable('lessons').onDelete('CASCADE');
    
    // Note content
    table.text('content').notNullable(); // The note text
    table.decimal('timestamp', 10, 2).notNullable(); // Video timestamp in seconds (e.g., 123.45)
    
    // Note type: 'note' (text note) or 'bookmark' (quick bookmark)
    table.string('type').defaultTo('note').notNullable(); // 'note' or 'bookmark'
    
    // Optional: Color/tag for organization
    table.string('color').defaultTo('default'); // 'default', 'yellow', 'green', 'blue', 'red', etc.
    
    // Optional: Title for bookmarks
    table.string('title'); // Optional title for bookmarks
    
    // Visibility: 'private' (only user) or 'public' (shared with course)
    table.string('visibility').defaultTo('private').notNullable();
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes for efficient queries
    table.index(['user_id', 'lesson_id']);
    table.index(['lesson_id', 'timestamp']);
    table.index(['user_id', 'created_at']);
    table.index(['type']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('video_notes');
};


