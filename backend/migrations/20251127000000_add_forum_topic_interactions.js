// Migration: Add forum topic likes and reports tables
exports.up = async function(knex) {
  // Check if forum_topic_likes table exists
  const likesTableExists = await knex.schema.hasTable('forum_topic_likes');
  if (!likesTableExists) {
    await knex.schema.createTable('forum_topic_likes', function(table) {
      table.increments('id').primary();
      table.integer('topic_id').unsigned().notNullable()
        .references('id').inTable('forum_topics').onDelete('CASCADE');
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.timestamps(true, true);

      // Prevent duplicate likes
      table.unique(['topic_id', 'user_id']);
    });
  }

  // Check if forum_reports table exists
  const reportsTableExists = await knex.schema.hasTable('forum_reports');
  if (!reportsTableExists) {
    await knex.schema.createTable('forum_reports', function(table) {
      table.increments('id').primary();
      table.integer('topic_id').unsigned().notNullable()
        .references('id').inTable('forum_topics').onDelete('CASCADE');
      table.integer('reported_by').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.string('reason').notNullable();
      table.text('details');
      table.string('status').defaultTo('pending'); // pending, reviewed, resolved
      table.timestamps(true, true);

      // Prevent duplicate reports from same user on same topic
      table.unique(['topic_id', 'reported_by']);
    });
  }

  // Add like_count to forum_topics if it doesn't exist
  const hasLikeCount = await knex.schema.hasColumn('forum_topics', 'like_count');
  if (!hasLikeCount) {
    await knex.schema.table('forum_topics', table => {
      table.integer('like_count').defaultTo(0);
    });
  }
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('forum_reports')
    .dropTableIfExists('forum_topic_likes')
    .then(() => {
      return knex.schema.hasColumn('forum_topics', 'like_count').then(exists => {
        if (exists) {
          return knex.schema.table('forum_topics', table => {
            table.dropColumn('like_count');
          });
        }
      });
    });
};
