/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('user_course_enrollments', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
    table.string('enrollment_status').defaultTo('active'); // active, completed, dropped
    table.timestamp('enrolled_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.decimal('progress_percentage', 5, 2).defaultTo(0);
    table.integer('current_lesson_id').unsigned().references('id').inTable('lessons').onDelete('SET NULL');
    table.timestamp('last_accessed_at').defaultTo(knex.fn.now());
    table.timestamps(true, true);
    
    // Ensure one enrollment per user per course
    table.unique(['user_id', 'course_id']);
    
    // Indexes for performance
    table.index(['user_id', 'enrollment_status']);
    table.index(['course_id', 'enrollment_status']);
    table.index(['enrolled_at']);
  });

  // Insert some sample enrollments for existing users
  // This ensures the student has at least one course to view
  await knex('user_course_enrollments').insert([
    {
      user_id: 2, // student@eoty.org
      course_id: 1, // Assuming course with ID 1 exists
      enrollment_status: 'active',
      progress_percentage: 25.0
    }
  ]).onConflict(['user_id', 'course_id']).ignore();
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_course_enrollments');
};