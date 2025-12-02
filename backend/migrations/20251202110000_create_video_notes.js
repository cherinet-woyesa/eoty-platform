exports.up = function(knex) {
  return knex.schema.createTable('video_notes', function(table) {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
    table.integer('lesson_id').unsigned().references('id').inTable('lessons').onDelete('CASCADE');
    table.text('content');
    table.float('timestamp'); // Video timestamp in seconds
    table.string('title');
    table.string('type').defaultTo('note'); // 'note', 'bookmark'
    table.string('color').defaultTo('#FFD700');
    table.string('visibility').defaultTo('private');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('video_notes');
};
