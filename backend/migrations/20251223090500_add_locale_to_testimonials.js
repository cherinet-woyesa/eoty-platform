const TABLE_NAME = 'testimonials';
const INDEX_NAME = 'testimonials_locale_active_idx';

exports.up = async function up(knex) {
  const tableExists = await knex.schema.hasTable(TABLE_NAME);
  if (!tableExists) {
    return;
  }

  const hasLocale = await knex.schema.hasColumn(TABLE_NAME, 'locale');
  if (!hasLocale) {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.string('locale', 10).notNullable().defaultTo('en');
    });

    await knex(TABLE_NAME)
      .whereNull('locale')
      .update({ locale: 'en' });
  }

  try {
    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.index(['locale', 'is_active'], INDEX_NAME);
    });
  } catch (error) {
    if (!error.message?.includes('already exists')) {
      throw error;
    }
  }
};

exports.down = async function down(knex) {
  const tableExists = await knex.schema.hasTable(TABLE_NAME);
  if (!tableExists) {
    return;
  }

  const hasLocale = await knex.schema.hasColumn(TABLE_NAME, 'locale');
  if (hasLocale) {
    try {
      await knex.schema.alterTable(TABLE_NAME, (table) => {
        table.dropIndex(['locale', 'is_active'], INDEX_NAME);
      });
    } catch (error) {
      if (!error.message?.includes('does not exist')) {
        throw error;
      }
    }

    await knex.schema.alterTable(TABLE_NAME, (table) => {
      table.dropColumn('locale');
    });
  }
};
