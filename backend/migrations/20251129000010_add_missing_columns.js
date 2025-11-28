exports.up = function(knex) {
  return knex.schema
    .table('user_onboarding', function(table) {
      table.timestamp('last_activity_at').defaultTo(knex.fn.now());
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.string('status').defaultTo('in_progress'); // 'in_progress', 'completed', 'skipped'
      table.integer('progress').defaultTo(0); // Percentage 0-100
    })
    .table('users', function(table) {
      table.string('locale').defaultTo('en');
      table.string('timezone').defaultTo('UTC');
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('users', function(table) {
      table.dropColumn('timezone');
      table.dropColumn('locale');
    })
    .table('user_onboarding', function(table) {
      table.dropColumn('progress');
      table.dropColumn('status');
      table.dropColumn('started_at');
      table.dropColumn('last_activity_at');
    });
};
