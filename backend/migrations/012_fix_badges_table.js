/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if badges table exists
  const hasBadgesTable = await knex.schema.hasTable('badges');
  
  if (hasBadgesTable) {
    // Add missing columns to badges table only if they don't exist
    const badgesColumns = await knex('information_schema.columns')
      .where({ table_name: 'badges', table_schema: 'public' })
      .select('column_name');
    
    const badgesColumnNames = badgesColumns.map(col => col.column_name);

    if (!badgesColumnNames.includes('badge_type')) {
      await knex.schema.table('badges', (table) => {
        table.string('badge_type').defaultTo('participation');
      });
    }

    if (!badgesColumnNames.includes('category')) {
      await knex.schema.table('badges', (table) => {
        table.string('category').nullable();
      });
    }

    if (!badgesColumnNames.includes('requirements')) {
      await knex.schema.table('badges', (table) => {
        table.jsonb('requirements').nullable();
      });
    }

    if (!badgesColumnNames.includes('is_active')) {
      await knex.schema.table('badges', (table) => {
        table.boolean('is_active').defaultTo(true);
      });
    }
  }

  // Check if user_badges table exists
  const hasUserBadgesTable = await knex.schema.hasTable('user_badges');
  
  if (hasUserBadgesTable) {
    // Check which columns already exist in user_badges
    const userBadgesColumns = await knex('information_schema.columns')
      .where({ table_name: 'user_badges', table_schema: 'public' })
      .select('column_name');
    
    const userBadgesColumnNames = userBadgesColumns.map(col => col.column_name);

    // Only add metadata column if it doesn't exist (earned_at already exists)
    if (!userBadgesColumnNames.includes('metadata')) {
      await knex.schema.table('user_badges', (table) => {
        table.jsonb('metadata').nullable();
      });
    }
  }
};

exports.down = async function(knex) {
  const hasBadgesTable = await knex.schema.hasTable('badges');
  const hasUserBadgesTable = await knex.schema.hasTable('user_badges');
  
  if (hasBadgesTable) {
    await knex.schema.table('badges', (table) => {
      table.dropColumn('badge_type');
      table.dropColumn('category');
      table.dropColumn('requirements');
      table.dropColumn('is_active');
    });
  }
  
  if (hasUserBadgesTable) {
    await knex.schema.table('user_badges', (table) => {
      table.dropColumn('metadata');
    });
  }
};