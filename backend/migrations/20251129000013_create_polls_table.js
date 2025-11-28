exports.up = function(knex) {
  return knex.schema.createTable('polls', function(table) {
    table.increments('id').primary();
    table.integer('lesson_id').notNullable(); // Assuming lessons table exists and uses integer IDs
    table.text('question').notNullable();
    table.jsonb('options').notNullable(); // Array of options
    table.string('type').defaultTo('single_choice'); // single_choice, multiple_choice
    table.boolean('is_active').defaultTo(true);
    table.boolean('is_published').defaultTo(true);
    table.integer('created_by').nullable(); // Teacher ID
    table.timestamps(true, true);

    table.index(['lesson_id']);
    table.index(['is_active']);
    table.index(['is_published']);
    table.index(['created_at']);
  })
  .createTable('poll_responses', function(table) {
    table.increments('id').primary();
    table.integer('poll_id').notNullable().references('id').inTable('polls').onDelete('CASCADE');
    table.integer('user_id').notNullable();
    table.jsonb('response').notNullable(); // Selected option(s)
    table.timestamps(true, true);

    table.index(['poll_id']);
    table.index(['user_id']);
    table.unique(['poll_id', 'user_id']); // One response per user per poll
  });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('poll_responses')
    .dropTableIfExists('polls');
};
