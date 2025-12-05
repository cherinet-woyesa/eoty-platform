exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    // 2FA columns
    table.boolean('is_2fa_enabled').defaultTo(false);
    table.string('two_factor_secret').nullable();
    table.jsonb('two_factor_recovery_codes').nullable();
    
    // Location columns
    table.string('address').nullable();
    table.string('city').nullable();
    table.string('state').nullable();
    table.string('country').nullable();
    table.string('zip_code').nullable();
    table.decimal('latitude', 10, 8).nullable();
    table.decimal('longitude', 11, 8).nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('is_2fa_enabled');
    table.dropColumn('two_factor_secret');
    table.dropColumn('two_factor_recovery_codes');
    table.dropColumn('address');
    table.dropColumn('city');
    table.dropColumn('state');
    table.dropColumn('country');
    table.dropColumn('zip_code');
    table.dropColumn('latitude');
    table.dropColumn('longitude');
  });
};
