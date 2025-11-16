/**
 * Migration: Enhance Onboarding System (FR6)
 * REQUIREMENT: Step-by-step guide, milestone-based, auto-resume, reminders
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if onboarding_steps table exists and has old structure
  const hasOnboardingSteps = await knex.schema.hasTable('onboarding_steps');
  const hasOldStructure = hasOnboardingSteps && await knex.schema.hasColumn('onboarding_steps', 'step_name');
  
  if (hasOldStructure) {
    // Drop old table structure and recreate with new structure
    await knex.schema.dropTableIfExists('onboarding_steps');
  }
  
  // Create onboarding_steps table with new structure
  if (!hasOnboardingSteps || hasOldStructure) {
    await knex.schema.createTable('onboarding_steps', (table) => {
      table.increments('id').primary();
      table.integer('flow_id').unsigned().notNullable();
      table.string('title').notNullable();
      table.text('description').nullable();
      table.text('content').nullable();
      table.string('step_type').defaultTo('info'); // info, action, video, quiz
      table.integer('milestone_id').unsigned().nullable();
      table.integer('order_index').defaultTo(0);
      table.json('prerequisites').nullable();
      table.string('video_url').nullable();
      table.string('action_required').nullable();
      table.boolean('auto_resume').defaultTo(true);
      table.boolean('is_required').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['flow_id', 'order_index']);
    });
  } else {
    // Table exists with new structure, just add missing columns
    const hasActionRequired = await knex.schema.hasColumn('onboarding_steps', 'action_required');
    if (!hasActionRequired) {
      // Check which columns are missing
      const hasMilestone = await knex.schema.hasColumn('onboarding_steps', 'milestone_id');
      const hasOrderIndex = await knex.schema.hasColumn('onboarding_steps', 'order_index');
      const hasPrerequisites = await knex.schema.hasColumn('onboarding_steps', 'prerequisites');
      const hasVideoUrl = await knex.schema.hasColumn('onboarding_steps', 'video_url');
      const hasAutoResume = await knex.schema.hasColumn('onboarding_steps', 'auto_resume');
      const hasIsRequired = await knex.schema.hasColumn('onboarding_steps', 'is_required');
      
      await knex.schema.table('onboarding_steps', (table) => {
        if (!hasMilestone) table.integer('milestone_id').unsigned().nullable();
        if (!hasOrderIndex) table.integer('order_index').defaultTo(0);
        if (!hasPrerequisites) table.json('prerequisites').nullable();
        if (!hasVideoUrl) table.string('video_url').nullable();
        table.string('action_required').nullable();
        if (!hasAutoResume) table.boolean('auto_resume').defaultTo(true);
        if (!hasIsRequired) table.boolean('is_required').defaultTo(true);
      });
    }
  }

  // Create onboarding_flows table
  const hasOnboardingFlows = await knex.schema.hasTable('onboarding_flows');
  if (!hasOnboardingFlows) {
    await knex.schema.createTable('onboarding_flows', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('audience').notNullable(); // new_user, new_teacher, new_admin
      table.text('description').nullable();
      table.boolean('is_active').defaultTo(true);
      table.integer('estimated_duration_minutes').defaultTo(10);
      table.timestamps(true, true);
      
      table.index(['audience', 'is_active']);
    });
  }

  // Create user_onboarding table (enhanced)
  const hasUserOnboarding = await knex.schema.hasTable('user_onboarding');
  if (!hasUserOnboarding) {
    await knex.schema.createTable('user_onboarding', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned();
      table.integer('flow_id').unsigned().references('id').inTable('onboarding_flows').onDelete('CASCADE');
      table.string('status').defaultTo('in_progress'); // in_progress, completed, skipped, dismissed
      table.decimal('progress', 5, 2).defaultTo(0.00); // 0.00 to 100.00
      table.integer('current_step_id').unsigned().nullable();
      table.json('completed_steps').defaultTo('[]');
      table.json('skipped_steps').defaultTo('[]');
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at').nullable();
      table.timestamp('last_activity_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.unique(['user_id', 'flow_id']);
      table.index(['user_id', 'status']);
      table.index(['status', 'last_activity_at']);
    });
  } else {
    // Add auto-resume tracking
    const hasCurrentStep = await knex.schema.hasColumn('user_onboarding', 'current_step_id');
    if (!hasCurrentStep) {
      await knex.schema.table('user_onboarding', (table) => {
        table.integer('current_step_id').unsigned().nullable();
        table.timestamp('last_activity_at').defaultTo(knex.fn.now());
      });
    }
  }

  // Create onboarding_step_completions table
  const hasStepCompletions = await knex.schema.hasTable('onboarding_step_completions');
  if (!hasStepCompletions) {
    await knex.schema.createTable('onboarding_step_completions', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned();
      table.integer('flow_id').unsigned().references('id').inTable('onboarding_flows').onDelete('CASCADE');
      table.integer('step_id').unsigned().references('id').inTable('onboarding_steps').onDelete('CASCADE');
      table.boolean('completed').defaultTo(true);
      table.integer('time_spent_seconds').defaultTo(0);
      table.json('completion_data').nullable();
      table.timestamp('completed_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.unique(['user_id', 'flow_id', 'step_id']);
      table.index(['user_id', 'flow_id']);
    });
  }

  // Create onboarding_milestones table (REQUIREMENT: Milestone-based)
  const hasMilestones = await knex.schema.hasTable('onboarding_milestones');
  if (!hasMilestones) {
    await knex.schema.createTable('onboarding_milestones', (table) => {
      table.increments('id').primary();
      table.integer('flow_id').unsigned().references('id').inTable('onboarding_flows').onDelete('CASCADE');
      table.string('name').notNullable();
      table.text('description').nullable();
      table.integer('step_count').defaultTo(0); // Number of steps in this milestone
      table.integer('badge_id').unsigned().nullable(); // Badge to unlock
      table.string('reward_type').nullable(); // badge, points, message
      table.json('reward_data').nullable();
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);
      
      table.index(['flow_id', 'order_index']);
    });
  }

  // Create onboarding_reminders table (REQUIREMENT: Follow-up reminders)
  const hasReminders = await knex.schema.hasTable('onboarding_reminders');
  if (!hasReminders) {
    await knex.schema.createTable('onboarding_reminders', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned();
      table.integer('flow_id').unsigned().references('id').inTable('onboarding_flows').onDelete('CASCADE');
      table.string('reminder_type').defaultTo('skipped'); // skipped, aborted, incomplete
      table.integer('reminder_count').defaultTo(0);
      table.timestamp('last_reminder_at').nullable();
      table.timestamp('next_reminder_at').nullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['user_id', 'is_active']);
      table.index(['next_reminder_at', 'is_active']);
    });
  }

  // Create help_resources table (REQUIREMENT: Contextual help, FAQ)
  const hasHelpResources = await knex.schema.hasTable('help_resources');
  if (!hasHelpResources) {
    await knex.schema.createTable('help_resources', (table) => {
      table.increments('id').primary();
      table.string('resource_type').notNullable(); // tooltip, modal, faq
      table.string('component').nullable(); // Component name for contextual help
      table.string('page').nullable(); // Page name
      table.string('audience').defaultTo('all'); // all, new_user, new_teacher, new_admin
      table.string('category').nullable(); // FAQ category
      table.string('title').notNullable();
      table.text('content').notNullable();
      table.integer('view_count').defaultTo(0);
      table.integer('helpful_count').defaultTo(0);
      table.boolean('is_active').defaultTo(true);
      table.timestamps(true, true);
      
      table.index(['resource_type', 'component', 'audience']);
      table.index(['category', 'audience']);
    });
  }

  // Create help_usage_tracking table
  const hasHelpUsage = await knex.schema.hasTable('help_usage_tracking');
  if (!hasHelpUsage) {
    await knex.schema.createTable('help_usage_tracking', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned();
      table.integer('help_resource_id').unsigned().references('id').inTable('help_resources').onDelete('CASCADE');
      table.string('interaction_type').defaultTo('viewed'); // viewed, helpful, not_helpful
      table.json('context').nullable();
      table.timestamp('interacted_at').defaultTo(knex.fn.now());
      table.timestamps(true, true);
      
      table.index(['user_id', 'help_resource_id']);
      table.index(['interaction_type', 'interacted_at']);
    });
  }

  // Create onboarding_completion_rewards table (REQUIREMENT: Completion rewards)
  const hasRewards = await knex.schema.hasTable('onboarding_completion_rewards');
  if (!hasRewards) {
    await knex.schema.createTable('onboarding_completion_rewards', (table) => {
      table.increments('id').primary();
      // Note: user_id foreign key not added due to potential type mismatch
      table.integer('user_id').unsigned();
      table.integer('flow_id').unsigned().references('id').inTable('onboarding_flows').onDelete('CASCADE');
      table.string('reward_type').notNullable(); // badge, points, message
      table.integer('badge_id').unsigned().nullable();
      table.integer('points').defaultTo(0);
      table.text('welcome_message').nullable();
      table.boolean('announcement_enabled').defaultTo(false);
      table.boolean('claimed').defaultTo(false);
      table.timestamp('earned_at').defaultTo(knex.fn.now());
      table.timestamp('claimed_at').nullable();
      table.timestamps(true, true);
      
      table.index(['user_id', 'flow_id']);
      table.index(['reward_type', 'claimed']);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('help_usage_tracking');
  await knex.schema.dropTableIfExists('help_resources');
  await knex.schema.dropTableIfExists('onboarding_completion_rewards');
  await knex.schema.dropTableIfExists('onboarding_reminders');
  await knex.schema.dropTableIfExists('onboarding_milestones');
  await knex.schema.dropTableIfExists('onboarding_step_completions');
  await knex.schema.dropTableIfExists('user_onboarding');
  await knex.schema.dropTableIfExists('onboarding_flows');
  // Note: Don't drop onboarding_steps as it might have been created in initial migration
};

