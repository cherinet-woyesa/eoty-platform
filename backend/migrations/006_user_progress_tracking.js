// Placeholder migration (no-op)
exports.up = function(knex) {
  return knex.schema
    .createTable('user_course_enrollments', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
      table.string('enrollment_status').defaultTo('active'); // 'active', 'completed', 'dropped'
      table.timestamp('enrolled_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'course_id']);
    })
    .createTable('user_lesson_progress', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('lesson_id').unsigned().notNullable().references('id').inTable('lessons').onDelete('CASCADE');
      table.boolean('is_completed').defaultTo(false);
      table.float('progress').defaultTo(0); // 0 to 100 or 0 to 1
      table.timestamp('last_accessed_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      table.unique(['user_id', 'lesson_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_lesson_progress')
    .dropTableIfExists('user_course_enrollments');
};
