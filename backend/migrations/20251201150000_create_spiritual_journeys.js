/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('journeys', function(table) {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.string('type').notNullable().defaultTo('challenge'); // seasonal, challenge, curriculum
      table.timestamp('start_date');
      table.timestamp('end_date');
      table.boolean('is_active').defaultTo(true);
      table.string('reward_badge_image');
      table.integer('created_by').unsigned().references('id').inTable('users');
      table.timestamps(true, true);
    })
    .createTable('journey_milestones', function(table) {
      table.increments('id').primary();
      table.integer('journey_id').unsigned().references('id').inTable('journeys').onDelete('CASCADE');
      table.string('title').notNullable();
      table.text('description');
      table.integer('order_index').notNullable();
      table.string('type').notNullable(); // content, quiz, action (e.g. "Log Prayer")
      table.integer('reference_id'); // ID of content/quiz if applicable
      table.jsonb('requirements').defaultTo('{}'); // e.g. { min_score: 80 }
      table.timestamps(true, true);
    })
    .createTable('user_journeys', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      table.integer('journey_id').unsigned().references('id').inTable('journeys').onDelete('CASCADE');
      table.string('status').defaultTo('in_progress'); // in_progress, completed, dropped
      table.integer('progress_percentage').defaultTo(0);
      table.timestamp('started_at').defaultTo(knex.fn.now());
      table.timestamp('completed_at');
      table.timestamps(true, true);
      
      table.unique(['user_id', 'journey_id']);
    })
    .createTable('user_milestones', function(table) {
      table.increments('id').primary();
      table.integer('user_journey_id').unsigned().references('id').inTable('user_journeys').onDelete('CASCADE');
      table.integer('milestone_id').unsigned().references('id').inTable('journey_milestones').onDelete('CASCADE');
      table.string('status').defaultTo('locked'); // locked, available, completed
      table.timestamp('completed_at');
      table.jsonb('metadata').defaultTo('{}');
      table.timestamps(true, true);
      
      table.unique(['user_journey_id', 'milestone_id']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('user_milestones')
    .dropTableIfExists('user_journeys')
    .dropTableIfExists('journey_milestones')
    .dropTableIfExists('journeys');
};
