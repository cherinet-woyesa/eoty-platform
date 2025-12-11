exports.up = async function(knex) {
  const hasParent = await knex.schema.hasColumn('study_group_messages', 'parent_message_id');
  if (!hasParent) {
    await knex.schema.alterTable('study_group_messages', (table) => {
      table.integer('parent_message_id').nullable().references('id').inTable('study_group_messages').onDelete('CASCADE');
      table.integer('likes_count').notNullable().defaultTo(0);
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }

  const hasLikes = await knex.schema.hasTable('study_group_message_likes');
  if (!hasLikes) {
    await knex.schema.createTable('study_group_message_likes', (table) => {
      table.increments('id').primary();
      table.integer('message_id').notNullable().references('id').inTable('study_group_messages').onDelete('CASCADE');
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['message_id', 'user_id']);
    });
    await knex.schema.alterTable('study_group_message_likes', (table) => {
      table.index(['message_id', 'user_id']);
    });
  }

  const hasReports = await knex.schema.hasTable('study_group_message_reports');
  if (!hasReports) {
    await knex.schema.createTable('study_group_message_reports', (table) => {
      table.increments('id').primary();
      table.integer('message_id').notNullable().references('id').inTable('study_group_messages').onDelete('CASCADE');
      table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.text('reason').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.unique(['message_id', 'user_id']);
    });
    await knex.schema.alterTable('study_group_message_reports', (table) => {
      table.index(['message_id', 'user_id']);
    });
  }
};

exports.down = async function(knex) {
  const hasLikes = await knex.schema.hasTable('study_group_message_likes');
  if (hasLikes) {
    await knex.schema.dropTableIfExists('study_group_message_likes');
  }
  const hasReports = await knex.schema.hasTable('study_group_message_reports');
  if (hasReports) {
    await knex.schema.dropTableIfExists('study_group_message_reports');
  }
  const hasParent = await knex.schema.hasColumn('study_group_messages', 'parent_message_id');
  if (hasParent) {
    await knex.schema.alterTable('study_group_messages', (table) => {
      table.dropColumn('parent_message_id');
      table.dropColumn('likes_count');
      table.dropColumn('updated_at');
    });
  }
};

