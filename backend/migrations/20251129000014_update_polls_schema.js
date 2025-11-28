exports.up = function(knex) {
  return knex.schema
    .table('polls', function(table) {
      table.text('description').nullable();
      table.boolean('allow_multiple_choice').defaultTo(false);
      table.boolean('show_results_before_voting').defaultTo(false);
      table.boolean('show_results_after_voting').defaultTo(true);
      table.timestamp('start_date').nullable();
      table.timestamp('end_date').nullable();
      table.integer('total_responses').defaultTo(0);
      table.jsonb('metadata').defaultTo('{}');
    })
    .table('poll_responses', function(table) {
      table.integer('option_id').nullable(); // ID of the selected option
      table.text('custom_answer').nullable();
      table.jsonb('response_metadata').nullable();
      table.dropColumn('response'); // Removing the old column as it doesn't match controller
    });
};

exports.down = function(knex) {
  return knex.schema
    .table('poll_responses', function(table) {
      table.jsonb('response').notNullable().defaultTo('{}');
      table.dropColumn('response_metadata');
      table.dropColumn('custom_answer');
      table.dropColumn('option_id');
    })
    .table('polls', function(table) {
      table.dropColumn('metadata');
      table.dropColumn('total_responses');
      table.dropColumn('end_date');
      table.dropColumn('start_date');
      table.dropColumn('show_results_after_voting');
      table.dropColumn('show_results_before_voting');
      table.dropColumn('allow_multiple_choice');
      table.dropColumn('description');
    });
};
