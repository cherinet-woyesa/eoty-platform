exports.up = function(knex) {
  return knex.schema
    // Activity Logs
    .createTable('activity_logs', function(table) {
      table.increments('id').primary();
      table.string('activity_type').notNullable();
      table.string('browser').nullable();
      table.string('device_type').nullable();
      table.string('failure_reason').nullable();
      table.string('ip_address').nullable();
      table.string('location').nullable();
      table.json('metadata').nullable();
      table.string('os').nullable();
      table.boolean('success').defaultTo(true);
      table.string('user_agent').nullable();
      table.integer('user_id').nullable(); // Can be null for failed logins
      table.timestamp('created_at').defaultTo(knex.fn.now());

      table.index(['user_id']);
      table.index(['activity_type']);
      table.index(['created_at']);
    })
    // Localization Settings
    .createTable('localization_settings', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable().unique();
      table.string('language').defaultTo('en');
      table.string('timezone').defaultTo('UTC');
      table.string('currency').defaultTo('USD');
      table.string('date_format').defaultTo('MM/DD/YYYY');
      table.timestamps(true, true);

      table.index(['user_id']);
    })
    // Onboarding Reminders
    .createTable('onboarding_reminders', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.string('reminder_type').notNullable();
      table.timestamp('next_reminder_at').notNullable();
      table.boolean('is_active').defaultTo(true);
      table.integer('reminder_count').defaultTo(0);
      table.timestamps(true, true);

      table.index(['user_id']);
      table.index(['next_reminder_at']);
    })
    // User Onboarding Progress
    .createTable('user_onboarding', function(table) {
      table.increments('id').primary();
      table.integer('user_id').notNullable();
      table.string('flow_id').notNullable();
      table.integer('current_step').defaultTo(0);
      table.boolean('is_completed').defaultTo(false);
      table.timestamp('completed_at').nullable();
      table.json('step_data').nullable();
      table.timestamps(true, true);

      table.unique(['user_id', 'flow_id']);
      table.index(['user_id']);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_onboarding')
    .dropTableIfExists('onboarding_reminders')
    .dropTableIfExists('localization_settings')
    .dropTableIfExists('activity_logs');
};
