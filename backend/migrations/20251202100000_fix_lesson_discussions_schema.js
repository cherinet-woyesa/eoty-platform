/**
 * Migration: fix lesson_discussions schema
 * - Change video_timestamp to decimal to allow fractional seconds
 * - Add moderation fields: is_moderated, moderated_by, moderated_at
 */
exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('lesson_discussions');
  if (!hasTable) return;

  // Alter video_timestamp type if column exists
  const hasVideoTimestamp = await knex.schema.hasColumn('lesson_discussions', 'video_timestamp');
  if (hasVideoTimestamp) {
    await knex.schema.alterTable('lesson_discussions', function(table) {
      table.decimal('video_timestamp', 10, 3).nullable().alter();
    });
  }

  // Add moderation fields if missing
  const hasIsModerated = await knex.schema.hasColumn('lesson_discussions', 'is_moderated');
  const hasModeratedBy = await knex.schema.hasColumn('lesson_discussions', 'moderated_by');
  const hasModeratedAt = await knex.schema.hasColumn('lesson_discussions', 'moderated_at');

  if (!hasIsModerated || !hasModeratedBy || !hasModeratedAt) {
    await knex.schema.alterTable('lesson_discussions', function(table) {
      if (!hasIsModerated) {
        table.boolean('is_moderated').notNullable().defaultTo(false);
      }
      if (!hasModeratedBy) {
        table.string('moderated_by').nullable();
      }
      if (!hasModeratedAt) {
        table.timestamp('moderated_at').nullable();
      }
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('lesson_discussions');
  if (!hasTable) return;
  // Best-effort down: only revert type if decimal
  const hasVideoTimestamp = await knex.schema.hasColumn('lesson_discussions', 'video_timestamp');
  if (hasVideoTimestamp) {
    await knex.schema.alterTable('lesson_discussions', function(table) {
      table.integer('video_timestamp').nullable().alter();
    });
  }
  // Drop moderation columns if they exist
  const hasIsModerated = await knex.schema.hasColumn('lesson_discussions', 'is_moderated');
  const hasModeratedBy = await knex.schema.hasColumn('lesson_discussions', 'moderated_by');
  const hasModeratedAt = await knex.schema.hasColumn('lesson_discussions', 'moderated_at');
  await knex.schema.alterTable('lesson_discussions', function(table) {
    if (hasIsModerated) table.dropColumn('is_moderated');
    if (hasModeratedBy) table.dropColumn('moderated_by');
    if (hasModeratedAt) table.dropColumn('moderated_at');
  });
};
