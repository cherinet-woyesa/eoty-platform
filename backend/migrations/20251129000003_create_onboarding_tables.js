exports.up = function(knex) {
  return knex.schema
    .createTable('onboarding_flows', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('audience').notNullable(); // 'new_user', 'new_teacher', 'new_admin'
      table.text('description').nullable();
      table.boolean('is_active').defaultTo(true);
      table.integer('estimated_duration_minutes').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('onboarding_milestones', function(table) {
      table.increments('id').primary();
      table.integer('flow_id').unsigned().notNullable().references('id').inTable('onboarding_flows').onDelete('CASCADE');
      table.string('name').notNullable();
      table.text('description').nullable();
      table.integer('step_count').defaultTo(0);
      table.integer('badge_id').nullable(); // Assuming badges table might exist or not, keeping it loose or integer
      table.string('reward_type').nullable(); // 'message', 'badge'
      table.jsonb('reward_data').nullable();
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);
    })
    .createTable('onboarding_steps', function(table) {
      table.increments('id').primary();
      table.integer('flow_id').unsigned().notNullable().references('id').inTable('onboarding_flows').onDelete('CASCADE');
      table.integer('milestone_id').unsigned().nullable().references('id').inTable('onboarding_milestones').onDelete('SET NULL');
      table.string('title').notNullable();
      table.text('description').nullable();
      table.text('content').nullable();
      table.string('step_type').defaultTo('info'); // 'info', 'action'
      table.text('action_required').nullable();
      table.integer('order_index').defaultTo(0);
      table.boolean('is_required').defaultTo(true);
      table.boolean('auto_resume').defaultTo(true);
      table.jsonb('prerequisites').defaultTo('[]');
      table.timestamps(true, true);
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('onboarding_steps')
    .dropTableIfExists('onboarding_milestones')
    .dropTableIfExists('onboarding_flows');
};
