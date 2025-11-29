
exports.up = function(knex) {
  return knex.schema.table('user_chapter_roles', table => {
    table.timestamp('assigned_at').defaultTo(knex.fn.now());
    table.integer('assigned_by').references('id').inTable('users').onDelete('SET NULL');
    table.jsonb('permissions').defaultTo('{}');
  });
};

exports.down = function(knex) {
  return knex.schema.table('user_chapter_roles', table => {
    table.dropColumn('assigned_at');
    table.dropColumn('assigned_by');
    table.dropColumn('permissions');
  });
};
