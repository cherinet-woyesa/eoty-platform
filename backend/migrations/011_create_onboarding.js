exports.up = async function(knex) {
  // Onboarding flows table
  await knex.schema.createTable('onboarding_flows', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('description');
    table.string('target_audience').notNullable(); // new_user, new_admin, new_teacher
    table.string('version').defaultTo('1.0.0');
    table.boolean('is_active').defaultTo(true);
    table.integer('estimated_minutes').defaultTo(10);
    table.json('prerequisites'); // Required conditions to start
    table.json('completion_rewards'); // Badges, points, etc.
    table.timestamps(true, true);
    
    table.index(['target_audience', 'is_active']);
  });

  // Onboarding steps table
  await knex.schema.createTable('onboarding_steps', (table) => {
    table.increments('id').primary();
    table.integer('flow_id').unsigned().notNullable();
    table.string('title').notNullable();
    table.text('description');
    table.string('step_type').notNullable(); // tutorial, video, action, quiz, info
    table.text('content'); // HTML content or instructions
    table.string('video_url'); // Optional video walkthrough
    table.string('action_required'); // Specific action user needs to take
    table.string('action_target'); // URL or component to target
    table.integer('order').defaultTo(0);
    table.boolean('is_optional').defaultTo(false);
    table.json('validation_rules'); // How to validate completion
    table.json('help_resources'); // Links to docs, FAQs, etc.
    table.timestamps(true, true);
    
    table.foreign('flow_id').references('id').inTable('onboarding_flows').onDelete('CASCADE');
    table.index(['flow_id', 'order']);
  });

  // User onboarding progress
  await knex.schema.createTable('user_onboarding', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('flow_id').unsigned().notNullable();
    table.string('status').defaultTo('in_progress'); // not_started, in_progress, completed, skipped
    table.integer('current_step_id').unsigned();
    table.decimal('progress', 5, 2).defaultTo(0.00); // 0.00 to 100.00
    table.timestamp('started_at').defaultTo(knex.fn.now());
    table.timestamp('completed_at');
    table.timestamp('last_activity_at').defaultTo(knex.fn.now());
    table.json('completed_steps'); // Track which steps are done
    table.json('skipped_steps'); // Track skipped steps
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('flow_id').references('id').inTable('onboarding_flows');
    table.foreign('current_step_id').references('id').inTable('onboarding_steps');
    table.unique(['user_id', 'flow_id']);
    table.index(['user_id', 'status']);
  });

  // Step completion tracking
  await knex.schema.createTable('onboarding_step_completions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('step_id').unsigned().notNullable();
    table.integer('flow_id').unsigned().notNullable();
    table.string('status').defaultTo('completed'); // completed, skipped, failed
    table.timestamp('completed_at').defaultTo(knex.fn.now());
    table.integer('time_spent_seconds').defaultTo(0); // Time taken to complete
    table.json('completion_data'); // Additional completion context
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('step_id').references('id').inTable('onboarding_steps');
    table.foreign('flow_id').references('id').inTable('onboarding_flows');
    table.unique(['user_id', 'step_id']);
    table.index(['user_id', 'flow_id']);
  });

  // Contextual help system
  await knex.schema.createTable('help_resources', (table) => {
    table.increments('id').primary();
    table.string('title').notNullable();
    table.text('content').notNullable();
    table.string('resource_type').notNullable(); // tooltip, modal, faq, video, doc
    table.string('target_component'); // Which UI component this helps with
    table.string('target_url'); // Which page/route this applies to
    table.string('audience').defaultTo('all'); // all, student, teacher, admin
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.json('triggers'); // When to show this help
    table.json('related_resources'); // Links to other help items
    table.timestamps(true, true);
    
    table.index(['resource_type', 'is_active']);
    table.index(['target_component', 'audience']);
  });

  // Help resource usage tracking
  await knex.schema.createTable('help_usage', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('help_resource_id').unsigned().notNullable();
    table.string('interaction_type'); // viewed, clicked, dismissed, completed
    table.json('context'); // Page, component, user state
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('help_resource_id').references('id').inTable('help_resources');
    table.index(['user_id', 'interaction_type']);
  });

  // Onboarding reminders
  await knex.schema.createTable('onboarding_reminders', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable();
    table.integer('flow_id').unsigned().notNullable();
    table.string('reminder_type').notNullable(); // email, notification, dashboard
    table.string('status').defaultTo('pending'); // pending, sent, dismissed, completed
    table.timestamp('scheduled_for').notNullable();
    table.timestamp('sent_at');
    table.text('message');
    table.json('metadata');
    table.timestamps(true, true);
    
    table.foreign('user_id').references('id').inTable('users');
    table.foreign('flow_id').references('id').inTable('onboarding_flows');
    table.index(['user_id', 'status', 'scheduled_for']);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTable('onboarding_reminders');
  await knex.schema.dropTable('help_usage');
  await knex.schema.dropTable('help_resources');
  await knex.schema.dropTable('onboarding_step_completions');
  await knex.schema.dropTable('user_onboarding');
  await knex.schema.dropTable('onboarding_steps');
  await knex.schema.dropTable('onboarding_flows');
};