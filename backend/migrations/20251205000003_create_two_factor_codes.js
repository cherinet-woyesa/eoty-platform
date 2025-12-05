exports.up = function(knex) {
  return knex.schema.createTable('two_factor_codes', function(table) {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('code').notNullable(); // We will store the hash of the 6-digit code
    table.timestamp('expires_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    table.index(['user_id']);
    table.index(['expires_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('two_factor_codes');
};
