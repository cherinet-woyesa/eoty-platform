exports.up = function(knex) {
  return knex.schema.alterTable('ai_summaries', function(table) {
    table.text('summary').nullable(); // Seed uses 'summary' instead of 'content'
    table.jsonb('key_points').defaultTo('[]');
    table.text('spiritual_insights').nullable();
    table.float('relevance_score').defaultTo(0);
    table.integer('word_count').defaultTo(0);
    table.string('model_used').nullable();
    table.boolean('admin_validated').defaultTo(false);
    table.boolean('meets_word_limit').defaultTo(true);
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('ai_summaries', function(table) {
    table.dropColumn('meets_word_limit');
    table.dropColumn('admin_validated');
    table.dropColumn('model_used');
    table.dropColumn('word_count');
    table.dropColumn('relevance_score');
    table.dropColumn('spiritual_insights');
    table.dropColumn('key_points');
    table.dropColumn('summary');
  });
};
