exports.up = function(knex) {
  return knex.schema
    .createTable('password_resets', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable(); // Remove foreign key constraint for now
      table.string('token_hash', 64).notNullable(); // SHA-256 hash
      table.timestamp('expires_at').notNullable();
      table.boolean('used').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Indexes
      table.index(['user_id']);
      table.index(['token_hash']);
      table.index(['expires_at']);
      table.index(['used']);
    })
    .createTable('email_verifications', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable(); // Remove foreign key constraint for now
      table.string('email').notNullable();
      table.string('token_hash', 64).notNullable(); // SHA-256 hash
      table.timestamp('expires_at').notNullable();
      table.boolean('verified').defaultTo(false);
      table.timestamp('verified_at').nullable();
      table.boolean('used').defaultTo(false);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Indexes
      table.index(['user_id']);
      table.index(['email']);
      table.index(['token_hash']);
      table.index(['expires_at']);
      table.index(['verified']);
      table.index(['used']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('email_verifications')
    .dropTableIfExists('password_resets');
};
