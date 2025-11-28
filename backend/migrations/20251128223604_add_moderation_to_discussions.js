/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  const hasAutoFlagReason = await knex.schema.hasColumn('lesson_discussions', 'auto_flag_reason');
  const hasIsAutoFlagged = await knex.schema.hasColumn('lesson_discussions', 'is_auto_flagged');
  const hasIsModerated = await knex.schema.hasColumn('lesson_discussions', 'is_moderated');

  return knex.schema.table('lesson_discussions', function(table) {
    if (!hasAutoFlagReason) table.string('auto_flag_reason').nullable();
    if (!hasIsAutoFlagged) table.boolean('is_auto_flagged').defaultTo(false);
    if (!hasIsModerated) table.boolean('is_moderated').defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('lesson_discussions', function(table) {
    // We don't drop columns in down migration to avoid data loss if we re-run
    // or we can check if they existed before dropping, but usually safe to drop if we added them.
    // For now, let's just try to drop them.
    table.dropColumn('auto_flag_reason');
    table.dropColumn('is_auto_flagged');
    // table.dropColumn('is_moderated'); // Don't drop is_moderated as it might have existed before
  });
};
