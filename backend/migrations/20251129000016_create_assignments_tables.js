exports.up = function(knex) {
  return knex.schema
    .createTable('assignments', function(table) {
      table.increments('id').primary();
      table.integer('course_id').notNullable(); // Foreign key constraint can be added if needed
      table.string('title').notNullable();
      table.text('description');
      table.timestamp('due_date');
      table.string('status').defaultTo('draft'); // draft, published, archived
      table.timestamps(true, true);
      
      table.index(['course_id']);
    })
    .createTable('assignment_submissions', function(table) {
      table.increments('id').primary();
      table.integer('assignment_id').notNullable().references('id').inTable('assignments').onDelete('CASCADE');
      table.integer('student_id').notNullable(); // Foreign key constraint can be added if needed
      table.text('content');
      table.string('file_url');
      table.string('status').defaultTo('submitted'); // submitted, graded, late
      table.float('score');
      table.text('feedback');
      table.timestamp('submitted_at').defaultTo(knex.fn.now());
      table.timestamp('graded_at');
      table.timestamps(true, true);

      table.index(['assignment_id']);
      table.index(['student_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('assignment_submissions')
    .dropTableIfExists('assignments');
};
