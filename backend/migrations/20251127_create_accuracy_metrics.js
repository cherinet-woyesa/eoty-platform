exports.up = async function(knex) {
  const hasAccuracyMetrics = await knex.schema.hasTable('accuracy_metrics');
  if (!hasAccuracyMetrics) {
    await knex.schema.createTable('accuracy_metrics', function(table) {
      table.increments('id').primary();
      table.string('session_id').notNullable();
      table.text('question').nullable();
      table.text('response').nullable();
      table.float('accuracy_score').nullable();
      table.jsonb('faith_alignment').nullable();
      table.jsonb('moderation_flags').nullable();
      table.boolean('is_accurate').defaultTo(false);
      table.jsonb('user_feedback').nullable();
      table.timestamp('timestamp').defaultTo(knex.fn.now());
    });
  }
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('accuracy_metrics');
};
