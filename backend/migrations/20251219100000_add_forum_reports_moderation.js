exports.up = async function (knex) {
    const hasModeratedBy = await knex.schema.hasColumn('forum_reports', 'moderated_by');
    const hasModeratedAt = await knex.schema.hasColumn('forum_reports', 'moderated_at');
    const hasModerationNotes = await knex.schema.hasColumn('forum_reports', 'moderation_notes');

    if (!hasModeratedBy || !hasModeratedAt || !hasModerationNotes) {
        await knex.schema.alterTable('forum_reports', (table) => {
            if (!hasModeratedBy) {
                table.integer('moderated_by').unsigned().references('id').inTable('users').onDelete('SET NULL');
            }
            if (!hasModeratedAt) {
                table.timestamp('moderated_at');
            }
            if (!hasModerationNotes) {
                table.text('moderation_notes');
            }
        });
    }
};

exports.down = async function (knex) {
    await knex.schema.alterTable('forum_reports', (table) => {
        table.dropColumn('moderated_by');
        table.dropColumn('moderated_at');
        table.dropColumn('moderation_notes');
    });
};
