exports.up = function(knex) {
  return knex.schema.hasTable('admin_anomalies').then(exists => {
    if (!exists) {
      return knex.schema.createTable('admin_anomalies', table => {
        table.increments('id').primary();
        table.string('type').notNullable(); // 'upload_time_exceeded', 'login_spike', etc.
        table.string('severity').defaultTo('warning'); // 'info', 'warning', 'critical'
        table.jsonb('details').defaultTo('{}');
        table.boolean('resolved').defaultTo(false);
        table.timestamp('resolved_at');
        table.integer('resolved_by').references('id').inTable('users');
        table.timestamps(true, true);
        
        table.index('type');
        table.index('severity');
        table.index('created_at');
      });
    }
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('admin_anomalies');
};
