/**
 * Migration: Create recording_presets table
 * for storing teacher recording preferences
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if table already exists
  const hasTable = await knex.schema.hasTable('recording_presets');
  if (hasTable) {
    console.log('✓ recording_presets table already exists, skipping migration');
    return;
  }

  await knex.schema.createTable('recording_presets', function(table) {
    table.increments('id').primary();
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable(); // Preset name (e.g., "High Quality", "Quick Record")
    table.string('quality').defaultTo('720p').notNullable(); // '480p', '720p', '1080p'
    table.integer('frame_rate').defaultTo(30).notNullable(); // 24, 30, 60
    table.integer('bitrate').nullable(); // Optional bitrate in kbps
    table.boolean('auto_adjust_quality').defaultTo(false).notNullable();
    table.string('video_device_id').nullable(); // Selected camera device ID
    table.string('audio_device_id').nullable(); // Selected microphone device ID
    table.boolean('enable_screen').defaultTo(false).notNullable();
    table.string('layout').defaultTo('picture-in-picture').notNullable(); // Layout type
    table.boolean('is_default').defaultTo(false).notNullable(); // Default preset for user
    table.timestamps(true, true);

    table.index(['user_id']);
    table.index(['user_id', 'is_default']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('recording_presets');
};

