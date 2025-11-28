exports.up = function(knex) {
  return knex.schema.createTable('sso_providers', function(table) {
    table.increments('id').primary();
    table.string('provider_name').notNullable().unique();
    table.string('client_id').notNullable();
    table.string('client_secret').notNullable();
    table.string('authorization_url').notNullable();
    table.string('token_url').notNullable();
    table.string('user_info_url').notNullable();
    table.jsonb('scopes').defaultTo('[]');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('sso_providers');
};
