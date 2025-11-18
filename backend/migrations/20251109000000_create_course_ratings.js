/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('course_ratings');
  if (hasTable) {
    console.log('✓ course_ratings table already exists, skipping migration');
    return;
  }

  // Create course_ratings table for rating courses
  await knex.schema.createTable('course_ratings', (table) => {
    table.increments('id').primary();
    table.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('rating').notNullable(); // 1-5 stars
    table.text('review');
    table.boolean('is_verified').defaultTo(false); // User actually enrolled in the course
    table.jsonb('helpful_votes').defaultTo('{"helpful": 0, "not_helpful": 0}');
    table.timestamps(true, true);
    
    table.unique(['course_id', 'user_id']);
    table.index(['course_id', 'rating']);
    table.index(['user_id', 'created_at']);
  });

  // Create course_stats table for aggregated course statistics
  await knex.schema.createTable('course_stats', (table) => {
    table.increments('id').primary();
    table.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
    table.integer('view_count').defaultTo(0);
    table.integer('enrollment_count').defaultTo(0);
    table.integer('completion_count').defaultTo(0);
    table.integer('favorite_count').defaultTo(0);
    table.decimal('average_rating', 3, 2).defaultTo(0);
    table.integer('rating_count').defaultTo(0);
    table.jsonb('engagement_metrics'); // Time spent, completion rates, etc.
    table.timestamp('last_accessed_at');
    table.timestamps(true, true);
    
    table.unique(['course_id']);
    table.index(['average_rating', 'rating_count']);
  });

  // Create course_favorites table
  await knex.schema.createTable('course_favorites', (table) => {
    table.increments('id').primary();
    table.integer('course_id').unsigned().notNullable().references('id').inTable('courses').onDelete('CASCADE');
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('favorited_at').defaultTo(knex.fn.now());
    table.jsonb('tags'); // User-defined tags for organization
    
    table.unique(['course_id', 'user_id']);
    table.index(['user_id', 'favorited_at']);
    table.index(['course_id']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('course_favorites');
  await knex.schema.dropTableIfExists('course_stats');
  await knex.schema.dropTableIfExists('course_ratings');
};