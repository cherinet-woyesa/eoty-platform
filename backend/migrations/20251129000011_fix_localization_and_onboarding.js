exports.up = function(knex) {
  return knex.schema
    // Add missing columns to localization_settings
    .table('localization_settings', function(table) {
      table.string('locale').defaultTo('en');
      table.string('time_format').defaultTo('12h');
      table.json('content_filters').nullable();
    })
    // Create onboarding_step_completions table
    .createTable('onboarding_step_completions', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.string('flow_id').notNullable();
      table.string('step_id').notNullable();
      table.boolean('completed').defaultTo(true);
      table.timestamp('completed_at').defaultTo(knex.fn.now());
      table.json('metadata').nullable();
      table.timestamps(true, true);

      table.index(['user_id', 'flow_id']);
      table.unique(['user_id', 'flow_id', 'step_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('onboarding_step_completions')
    .table('localization_settings', function(table) {
      table.dropColumn('content_filters');
      table.dropColumn('time_format');
      table.dropColumn('locale');
    });
};
