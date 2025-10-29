/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Chapters
  await knex.schema.createTable('chapters', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('location');
    table.text('description');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });

  // Users
  await knex.schema.createTable('users', function(table) {
    table.increments('id').primary();
    table.string('first_name').notNullable();
    table.string('last_name').notNullable();
    table.string('email').notNullable().unique();
    table.string('password_hash');
    table.string('role').notNullable().defaultTo('student');
    table.integer('chapter_id').unsigned().references('id').inTable('chapters').onDelete('SET NULL');
    table.string('phone_number');
    table.string('address');
    table.string('profile_picture');
    table.boolean('email_verified').defaultTo(false);
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.text('bio');
    table.timestamps(true, true);
  });

  // Roles
  await knex.schema.createTable('roles', function(table) {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.text('description');
    table.timestamps(true, true);
  });

  // User Roles
  await knex.schema.createTable('user_roles', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('role_id').unsigned().references('id').inTable('roles').onDelete('CASCADE');
    table.unique(['user_id', 'role_id']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('user_roles');
  await knex.schema.dropTableIfExists('roles');
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('chapters');
};