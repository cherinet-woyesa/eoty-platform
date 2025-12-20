/**
 * Migration: Add display_order column to content_tags table
 * This fixes the tag creation error where display_order column is missing
 */

exports.up = async function (knex) {
    const hasColumn = await knex.schema.hasColumn('content_tags', 'display_order');

    if (!hasColumn) {
        await knex.schema.alterTable('content_tags', (table) => {
            table.integer('display_order').defaultTo(0);
        });

        // Backfill existing tags with sequential display_order
        const tags = await knex('content_tags').select('id').orderBy('created_at', 'asc');
        for (let i = 0; i < tags.length; i++) {
            await knex('content_tags')
                .where('id', tags[i].id)
                .update({ display_order: i + 1 });
        }

        console.log('✓ Added display_order column to content_tags and backfilled existing records');
    } else {
        console.log('✓ display_order column already exists in content_tags');
    }
};

exports.down = async function (knex) {
    const hasColumn = await knex.schema.hasColumn('content_tags', 'display_order');

    if (hasColumn) {
        await knex.schema.alterTable('content_tags', (table) => {
            table.dropColumn('display_order');
        });
    }
};
