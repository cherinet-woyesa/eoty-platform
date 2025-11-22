// Migration: Add section anchoring columns to user_notes table
// This adds section anchoring support to existing user_notes table

exports.up = async function(knex) {
  // Check if user_notes table exists
  const tableExists = await knex.schema.hasTable('user_notes');

  if (!tableExists) {
    // Create table if it doesn't exist
    await knex.schema.createTable('user_notes', function(table) {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
      table.text('content').notNullable();
      table.boolean('is_public').defaultTo(false);

      // Section anchoring columns (REQUIREMENT: Anchor notes to sections)
      table.string('anchor_point').nullable(); // Legacy support
      table.string('section_anchor').nullable(); // New section anchoring
      table.text('section_text').nullable(); // Excerpt of section text
      table.integer('section_position').nullable(); // Position in document

      // Tags for organization
      table.jsonb('tags').defaultTo('[]');

      table.timestamps(true, true);

      // Indexes for performance
      table.index(['user_id', 'resource_id']);
      table.index(['resource_id', 'is_public']);
      table.index(['created_at']);
    });
  } else {
    // Add missing columns to existing table
    const hasAnchorPoint = await knex.schema.hasColumn('user_notes', 'anchor_point');
    if (!hasAnchorPoint) {
      await knex.schema.table('user_notes', table => {
        table.string('anchor_point').nullable();
      });
    }

    const hasSectionAnchor = await knex.schema.hasColumn('user_notes', 'section_anchor');
    if (!hasSectionAnchor) {
      await knex.schema.table('user_notes', table => {
        table.string('section_anchor').nullable();
      });
    }

    const hasSectionText = await knex.schema.hasColumn('user_notes', 'section_text');
    if (!hasSectionText) {
      await knex.schema.table('user_notes', table => {
        table.text('section_text').nullable();
      });
    }

    const hasSectionPosition = await knex.schema.hasColumn('user_notes', 'section_position');
    if (!hasSectionPosition) {
      await knex.schema.table('user_notes', table => {
        table.integer('section_position').nullable();
      });
    }

    const hasTags = await knex.schema.hasColumn('user_notes', 'tags');
    if (!hasTags) {
      await knex.schema.table('user_notes', table => {
        table.jsonb('tags').defaultTo('[]');
      });
    }
  }
};

exports.down = function(knex) {
  // Only drop columns, don't drop table
  return knex.schema.table('user_notes', table => {
    table.dropColumn('tags');
    table.dropColumn('section_position');
    table.dropColumn('section_text');
    table.dropColumn('section_anchor');
    table.dropColumn('anchor_point');
  });
};
