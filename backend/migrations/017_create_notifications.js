exports.up = function(knex) {
  return knex.schema
    .createTable('notifications', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.text('message').notNullable();
      table.enum('type', ['video_available', 'quiz_available', 'new_discussion', 'moderation_required', 'system']).notNullable();
      table.boolean('is_read').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('read_at');
      
      table.index(['user_id']);
      table.index(['type']);
      table.index(['is_read']);
      table.index(['created_at']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('notifications');
};