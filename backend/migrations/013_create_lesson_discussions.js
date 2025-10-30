/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
    // Create lesson_discussions table with all required columns
    await knex.schema.createTable('lesson_discussions', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
      table.integer('parent_id').unsigned().references('id').inTable('lesson_discussions').onDelete('CASCADE').nullable();
      table.text('content').notNullable();
      table.float('video_timestamp').nullable();
      table.boolean('is_pinned').defaultTo(false);
      table.boolean('is_moderated').defaultTo(false);
      table.integer('report_count').defaultTo(0);
      table.boolean('is_auto_flagged').defaultTo(false);
      table.string('auto_flag_reason', 50).nullable();
      table.timestamps(true, true);
      
      table.index(['lesson_id', 'created_at']);
      table.index(['parent_id']);
      table.index(['user_id', 'lesson_id']);
    });
  };
  
  exports.down = async function(knex) {
    await knex.schema.dropTableIfExists('lesson_discussions');
  };