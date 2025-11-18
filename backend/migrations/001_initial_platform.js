/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('chapters');
  if (hasTable) {
    console.log('✓ chapters table already exists, skipping migration');
    return;
  }

  // Chapters - foundation of the platform
  await knex.schema.createTable('chapters', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('location');
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Users - core user management
  await knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash');
    // Base role generalized from 'student' to 'user'
    table.string('role').notNullable().defaultTo('user');
    table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('SET NULL');
    table.string('phone_number');
    table.string('address');
    table.string('profile_picture');
    table.boolean('email_verified').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.text('bio');
    table.timestamps(true, true);
    
    table.index(['chapter_id', 'is_active']);
    table.index(['email', 'role']);
  });

  // Google OAuth integration
  await knex.schema.createTable('google_auth', (table) => {
    table.increments('id').primary();
    table.string('user_id').notNullable().onDelete('CASCADE');
    table.string('google_id').unique().notNullable();
    table.string('email').notNullable();
    table.string('profile_picture');
    table.timestamps(true, true);
  });

  // Onboarding system
  await knex.schema.createTable('onboarding_steps', (table) => {
    table.increments('id').primary();
    table.string('user_id').notNullable().onDelete('CASCADE');
    table.string('step_name').notNullable();
    table.boolean('completed').defaultTo(false);
    table.timestamps(true, true);
    
    table.unique(['user_id', 'step_name']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('onboarding_steps');
  await knex.schema.dropTableIfExists('google_auth');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('chapters');
};