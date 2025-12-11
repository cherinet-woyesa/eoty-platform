/**
 * Learning paths schema: curated paths, course mapping, and user enrollments.
 * Uses snake_case to stay consistent with existing tables.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasPaths = await knex.schema.hasTable('learning_paths');
  if (!hasPaths) {
    await knex.schema.createTable('learning_paths', table => {
      table.increments('id').primary();
      table.string('slug').unique().index();
      table.string('title').notNullable();
      table.text('description').nullable();
      table.string('category').nullable().index();
      table.string('difficulty').defaultTo('beginner').index(); // beginner | intermediate | advanced
      table.integer('estimated_duration_hours').defaultTo(0);
      table.string('thumbnail_url').nullable();
      table.boolean('is_published').defaultTo(false).index();
      table.integer('created_by').nullable().index();
      table.json('metadata').nullable();
      table.timestamps(true, true);
    });
  }

  const hasCourses = await knex.schema.hasTable('learning_path_courses');
  if (!hasCourses) {
    await knex.schema.createTable('learning_path_courses', table => {
      table.increments('id').primary();
      table.integer('path_id').notNullable().references('id').inTable('learning_paths').onDelete('CASCADE').index();
      table.integer('course_id').notNullable().references('id').inTable('courses').onDelete('CASCADE').index();
      table.integer('order').defaultTo(1);
      table.boolean('is_required').defaultTo(true);
      table.timestamps(true, true);
      table.unique(['path_id', 'course_id']);
    });
  }

  const hasEnrollments = await knex.schema.hasTable('learning_path_enrollments');
  if (!hasEnrollments) {
    await knex.schema.createTable('learning_path_enrollments', table => {
      table.increments('id').primary();
      table.integer('path_id').notNullable().references('id').inTable('learning_paths').onDelete('CASCADE').index();
      table.integer('user_id').notNullable().index();
      table.decimal('progress', 5, 2).defaultTo(0); // 0 - 100
      table.string('status').defaultTo('active').index(); // active | completed | archived
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at').nullable();
      table.timestamp('last_accessed_at').nullable();
      table.json('metadata').nullable();
      table.timestamps(true, true);
      table.unique(['path_id', 'user_id']);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const dropIfExists = async (name) => {
    const exists = await knex.schema.hasTable(name);
    if (exists) {
      await knex.schema.dropTable(name);
    }
  };

  await dropIfExists('learning_path_enrollments');
  await dropIfExists('learning_path_courses');
  await dropIfExists('learning_paths');
};


