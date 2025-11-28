exports.up = function(knex) {
  return knex.schema.createTable('faith_alignment_labels', function(table) {
    table.bigIncrements('id').primary();
    table.integer('user_id').nullable();
    table.string('session_id').notNullable().defaultTo('default');
    table.text('text').notNullable();
    table.jsonb('label').nullable();
    table.text('notes').nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('faith_alignment_labels');
};
