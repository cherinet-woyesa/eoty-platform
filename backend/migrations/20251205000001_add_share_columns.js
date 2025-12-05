exports.up = function(knex) {
  return knex.schema.table('community_post_shares', function(table) {
    table.text('message').nullable();
    table.string('share_type').notNullable().defaultTo('public'); // 'user', 'chapter', 'public'
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.table('community_post_shares', function(table) {
    table.dropColumn('message');
    table.dropColumn('share_type');
    table.dropColumn('updated_at');
  });
};
