/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('courses');
  if (hasTable) {
    console.log('✓ courses table already exists, skipping migration');
    return;
  }

  // Courses - main learning content
  await knex.schema.createTable('courses', function(table) {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.string('category');
    table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('CASCADE');
    table.string('created_by').onDelete('SET NULL');
    table.boolean('is_published').defaultTo(false);
    table.timestamp('published_at');
    table.jsonb('metadata'); // Course settings, prerequisites, etc.
    table.timestamps(true, true);
    
    table.index(['chapter_id', 'is_published']);
    table.index(['category', 'created_at']);
  });

  // Lessons - individual learning units
  await knex.schema.createTable('lessons', function(table) {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('description');
    table.integer('course_id').unsigned().references('id').inTable('courses').onDelete('CASCADE');
    table.integer('order').defaultTo(0);
    table.string('video_url');
    table.string('created_by').onDelete('SET NULL');
    table.boolean('is_published').defaultTo(false);
    table.timestamp('published_at');
    table.integer('duration').defaultTo(0); // in minutes
    table.jsonb('learning_objectives');
    table.timestamps(true, true);
    
    table.index(['course_id', 'order']);
    table.index(['course_id', 'is_published']);
  });

  // Lesson prerequisites
  await knex.schema.createTable('lesson_prerequisites', (table) => {
    table.increments('id').primary();
    table.integer('lesson_id').unsigned().notNullable().references('id').inTable('lessons').onDelete('CASCADE');
    table.integer('prerequisite_lesson_id').unsigned().notNullable().references('id').inTable('lessons').onDelete('CASCADE');
    table.string('importance').defaultTo('recommended'); // required, recommended, optional
    table.timestamps(true, true);
    
    table.unique(['lesson_id', 'prerequisite_lesson_id']);
    table.index(['lesson_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('lesson_prerequisites');
  await knex.schema.dropTableIfExists('lessons');
  await knex.schema.dropTableIfExists('courses');
};