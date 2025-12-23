const TABLE_NAME = 'landing_page_content';

exports.up = async function up(knex) {
  const tableExists = await knex.schema.hasTable(TABLE_NAME);
  if (!tableExists) {
    return;
  }

  const hasLocale = await knex.schema.hasColumn(TABLE_NAME, 'locale');
  const hasRegion = await knex.schema.hasColumn(TABLE_NAME, 'region');

  await knex.schema.alterTable(TABLE_NAME, table => {
    if (!hasLocale) {
      table.string('locale', 10).notNullable().defaultTo('en');
    }
    if (!hasRegion) {
      table.string('region', 50);
    }
  });

  if (!hasLocale) {
    await knex(TABLE_NAME).update({ locale: 'en' }).whereNull('locale');
    await knex.schema.alterTable(TABLE_NAME, table => {
      table.index(['locale', 'is_active'], 'landing_content_locale_active_idx');
    });
  }
};

exports.down = async function down(knex) {
  const tableExists = await knex.schema.hasTable(TABLE_NAME);
  if (!tableExists) {
    return;
  }

  const hasLocale = await knex.schema.hasColumn(TABLE_NAME, 'locale');
  const hasRegion = await knex.schema.hasColumn(TABLE_NAME, 'region');

  if (hasLocale) {
    const hasIndex = await knex.schema.hasTable(TABLE_NAME);
    if (hasIndex) {
      await knex.schema.alterTable(TABLE_NAME, table => {
        table.dropIndex(['locale', 'is_active'], 'landing_content_locale_active_idx');
      });
    }
  }

  await knex.schema.alterTable(TABLE_NAME, table => {
    if (hasRegion) {
      table.dropColumn('region');
    }
    if (hasLocale) {
      table.dropColumn('locale');
    }
  });
};
