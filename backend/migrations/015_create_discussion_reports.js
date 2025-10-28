exports.up = function(knex) {
  return knex.schema
    .createTable('discussion_reports', function(table) {
      table.increments('id').primary();
      table.integer('post_id').references('id').inTable('lesson_discussions').onDelete('CASCADE');
      table.integer('reporter_id').references('id').inTable('users').onDelete('CASCADE');
      table.enum('reason', ['inappropriate', 'spam', 'harassment', 'offensive', 'other']).notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      
      table.unique(['post_id', 'reporter_id']); // Prevent duplicate reports
      table.index(['post_id']);
      table.index(['reporter_id']);
    })
    .table('lesson_discussions', function(table) {
      // Add new columns for enhanced moderation
      table.integer('report_count').defaultTo(0);
      table.boolean('is_auto_flagged').defaultTo(false);
      table.string('auto_flag_reason', 50);
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('lesson_discussions', function(table) {
      // Remove new columns
      table.dropColumn('report_count');
      table.dropColumn('is_auto_flagged');
      table.dropColumn('auto_flag_reason');
    })
    .dropTable('discussion_reports');
};