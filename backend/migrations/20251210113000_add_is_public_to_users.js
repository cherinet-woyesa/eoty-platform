exports.up = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'is_public');
  if (!hasColumn) {
    await knex.schema.alterTable('users', table => {
      table.boolean('is_public').defaultTo(true);
      table.jsonb('notification_preferences').defaultTo('{}');
    });
  }
};

exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('users', 'is_public');
  if (hasColumn) {
    await knex.schema.alterTable('users', table => {
      table.dropColumn('is_public');
      table.dropColumn('notification_preferences');
    });
  }
};

