exports.up = function(knex) {
  return knex.schema.createTable('bookmarks', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.string('entity_type').notNullable(); // 'course', 'lesson'
    table.integer('entity_id').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Unique constraint to prevent duplicate bookmarks
    table.unique(['user_id', 'entity_type', 'entity_id']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('bookmarks');
};
