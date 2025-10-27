exports.up = function(knex) {
  return knex.schema
    .createTable('chapters', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable().unique();
      table.string('location');
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
    })
    .createTable('users', function(table) {
      table.increments('id').primary();
      table.string('first_name').notNullable();
      table.string('last_name').notNullable();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('role').notNullable().defaultTo('student');
      table.integer('chapter_id').references('id').inTable('chapters');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('last_login_at');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('users')
    .dropTableIfExists('chapters');
};