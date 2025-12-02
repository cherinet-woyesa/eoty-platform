exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('assignments');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('assignments', 'created_by');
  if (!hasColumn) {
    await knex.schema.table('assignments', function(table) {
      table.integer('created_by').nullable();
      table.index(['created_by']);
    });
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('assignments');
  if (!hasTable) return;

  const hasColumn = await knex.schema.hasColumn('assignments', 'created_by');
  if (hasColumn) {
    await knex.schema.table('assignments', function(table) {
      table.dropIndex(['created_by']);
      table.dropColumn('created_by');
    });
  }
};