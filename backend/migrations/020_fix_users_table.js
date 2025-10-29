exports.up = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    // Add missing columns
    table.string('role').defaultTo('student');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.integer('chapter_id').references('id').inTable('chapters').onDelete('SET NULL');
    table.string('profile_picture').nullable();
    table.text('bio').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('users', function(table) {
    table.dropColumn('role');
    table.dropColumn('is_active');
    table.dropColumn('last_login_at');
    table.dropColumn('chapter_id');
    table.dropColumn('profile_picture');
    table.dropColumn('bio');
  });
};

