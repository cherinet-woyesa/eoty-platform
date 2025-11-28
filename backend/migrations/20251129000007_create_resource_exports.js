exports.up = function(knex) {
  return knex.schema.createTable('resource_exports', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('resource_id').unsigned().notNullable().references('id').inTable('resources').onDelete('CASCADE');
    table.string('export_type').notNullable(); // 'notes', 'summary', 'combined'
    table.string('format').notNullable(); // 'pdf', 'json', 'docx'
    table.jsonb('export_data').notNullable(); // The actual exported data
    table.timestamps(true, true);

    // Indexes for performance
    table.index(['user_id', 'created_at']);
    table.index(['resource_id', 'export_type']);
    table.index(['created_at']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('resource_exports');
};
