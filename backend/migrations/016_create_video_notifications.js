exports.up = function(knex) {
  return knex.schema
    .createTable('video_availability_notifications', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').references('id').inTable('lessons').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('notified_at');
      table.boolean('is_notified').defaultTo(false);
      
      table.unique(['user_id', 'lesson_id']); // Prevent duplicate notifications
      table.index(['user_id']);
      table.index(['lesson_id']);
      table.index(['is_notified']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('video_availability_notifications');
};