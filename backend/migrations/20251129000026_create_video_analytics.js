exports.up = function(knex) {
  return knex.schema.createTable('video_analytics', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('mux_view_id').nullable();
    table.float('watch_time_seconds').defaultTo(0);
    table.float('video_duration_seconds').defaultTo(0);
    table.float('completion_percentage').defaultTo(0);
    table.boolean('session_completed').defaultTo(false);
    table.string('device_type').nullable();
    table.string('browser').nullable();
    table.string('os').nullable();
    table.string('country').nullable();
    table.string('region').nullable();
    table.timestamp('session_started_at').defaultTo(knex.fn.now());
    table.timestamp('session_ended_at').nullable();
    table.timestamps(true, true);
    
    // Indexes for performance
    table.index(['lesson_id']);
    table.index(['user_id']);
    table.index(['mux_view_id']);
    table.index(['session_started_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('video_analytics');
};
