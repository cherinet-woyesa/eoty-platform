exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('resources', 'original_filename');

  if (!hasColumn) {
    await knex.schema.alterTable('resources', function(table) {
      table.string('original_filename').nullable();
    });
  }

  await knex('resources')
    .whereNull('original_filename')
    .update({ original_filename: knex.raw('COALESCE(file_name, title)') });
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('resources', 'original_filename');

  if (hasColumn) {
    await knex.schema.alterTable('resources', function(table) {
      table.dropColumn('original_filename');
    });
  }
};
