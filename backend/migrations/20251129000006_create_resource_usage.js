exports.up = function(knex) {
  return knex.schema.createTable('resource_usage', function(table) {
    table.increments('id').primary();
    table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('action').notNullable(); // 'view', 'download', etc.
    table.jsonb('metadata').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes for performance
    table.index(['resource_id', 'action']);
    table.index(['user_id', 'action']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('resource_usage');
};
