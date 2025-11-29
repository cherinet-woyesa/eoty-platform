exports.up = function(knex) {
  return knex.schema.table('video_analytics', function(table) {
    table.integer('rebuffer_count').defaultTo(0);
    table.integer('rebuffer_duration_ms').defaultTo(0);
  });
};

exports.down = function(knex) {
  return knex.schema.table('video_analytics', function(table) {
    table.dropColumn('rebuffer_count');
    table.dropColumn('rebuffer_duration_ms');
  });
};
