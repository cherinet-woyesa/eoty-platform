exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('chapter_join_requests');
  if (!exists) {
    await knex.schema.createTable('chapter_join_requests', (table) => {
      table.increments('id').primary();
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('chapter_id').notNullable().references('id').inTable('chapters').onDelete('CASCADE');
      table.enu('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
      table.text('note');
      table.integer('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
      table.timestamp('reviewed_at');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.unique(['user_id', 'chapter_id']);
      table.index(['chapter_id', 'status']);
    });
  }
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('chapter_join_requests');
};

