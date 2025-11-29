exports.up = function(knex) {
  return knex.schema.hasTable('analytics_snapshots').then(exists => {
    if (!exists) {
      return knex.schema.createTable('analytics_snapshots', table => {
        table.increments('id').primary();
        table.string('snapshot_type', 50).notNullable(); // 'daily', 'weekly', 'monthly', etc.
        table.timestamp('snapshot_date').notNullable();
        table.text('metrics'); // JSON string of metrics data
        table.text('chapter_comparison'); // JSON string of chapter comparison data
        table.text('trends'); // JSON string of trends data
        table.decimal('accuracy_score', 5, 4).nullable();
        table.timestamp('verified_at').nullable();
        table.timestamps(true, true);
        
        // Indexes
        table.index('snapshot_type');
        table.index('snapshot_date');
        table.index(['snapshot_type', 'snapshot_date']);
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('analytics_snapshots');
};