exports.up = function(knex) {
  return knex.schema.createTable('user_chapters', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('chapter_id').notNullable().references('id').inTable('chapters').onDelete('CASCADE');
    table.string('role').defaultTo('member');
    table.boolean('is_primary').defaultTo(false);
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.unique(['user_id', 'chapter_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('user_chapters');
};
