exports.up = async function (knex) {
    const hasColor = await knex.schema.hasColumn('content_tags', 'color');

    if (!hasColor) {
        await knex.schema.alterTable('content_tags', (table) => {
            table.string('color', 7).defaultTo('#3B82F6');
        });
    }
};

exports.down = async function (knex) {
    await knex.schema.alterTable('content_tags', (table) => {
        table.dropColumn('color');
    });
};
