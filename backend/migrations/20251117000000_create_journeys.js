/**
 * Migration: Create journeys and journey_items tables (Spiritual Journeys)
 * Journeys are curated learning paths composed of courses/resources.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function up(knex) {
  // Create journeys table
  const hasJourneys = await knex.schema.hasTable('journeys');
  if (!hasJourneys) {
    await knex.schema.createTable('journeys', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('description');
      table.string('audience').notNullable().defaultTo('student'); // student, teacher, admin, all
      table
        .integer('chapter_id')
        .unsigned()
        .references('id')
        .inTable('chapters')
        .onDelete('SET NULL');
      table.boolean('is_active').defaultTo(true);
      // creator info (no FK to avoid type mismatch issues)
      table.integer('created_by').unsigned();
      table.timestamps(true, true);

      table.index(['audience', 'chapter_id', 'is_active']);
    });
  }

  // Create journey_items table
  const hasJourneyItems = await knex.schema.hasTable('journey_items');
  if (!hasJourneyItems) {
    await knex.schema.createTable('journey_items', (table) => {
      table.increments('id').primary();
      table
        .integer('journey_id')
        .unsigned()
        .references('id')
        .inTable('journeys')
        .onDelete('CASCADE');
      table.string('item_type').notNullable(); // 'course' | 'resource'
      table.integer('item_id').unsigned().notNullable();
      table.integer('order_index').defaultTo(0);
      table.timestamps(true, true);

      table.index(['journey_id', 'item_type', 'item_id']);
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('journey_items');
  await knex.schema.dropTableIfExists('journeys');
};



