exports.up = function(knex) {
  return knex.schema.createTable('community_posts', function(table) {
    table.increments('id').primary();
    table.integer('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('author_name').notNullable();
    table.string('author_avatar').nullable();
    table.text('content').notNullable();
    table.enu('media_type', ['image', 'video', 'audio', 'article']).nullable();
    table.string('media_url').nullable();
    table.integer('likes').defaultTo(0);
    table.integer('comments').defaultTo(0);
    table.integer('shares').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('community_posts');
};
