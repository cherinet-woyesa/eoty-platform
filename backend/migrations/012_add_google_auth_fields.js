exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    // Add Google ID field for Google OAuth
    table.string('google_id').unique();
    
    // Add profile picture field
    table.string('profile_picture');
    
    // Make password_hash nullable since Google users won't have a password
    table.string('password_hash').nullable().alter();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('google_id');
    table.dropColumn('profile_picture');
    table.string('password_hash').notNullable().alter();
  });
};