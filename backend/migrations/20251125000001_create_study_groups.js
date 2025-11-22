exports.up = function(knex) {
  return knex.schema
    .createTable('study_groups', function(table) {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.text('description').nullable();
      table.integer('course_id').nullable().references('id').inTable('courses').onDelete('SET NULL');
      table.string('course_title').nullable();
      table.integer('member_count').defaultTo(1);
      table.integer('max_members').defaultTo(50);
      table.boolean('is_public').defaultTo(true);
      table.integer('created_by').notNullable();
      table.string('created_by_name').notNullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('study_group_members', function(table) {
      table.increments('id').primary();
      table.integer('group_id').notNullable().references('id').inTable('study_groups').onDelete('CASCADE');
      table.integer('user_id').notNullable();
      table.string('user_name').notNullable();
      table.enu('role', ['admin', 'member']).defaultTo('member');
      table.timestamp('joined_at').defaultTo(knex.fn.now());
      table.unique(['group_id', 'user_id']); // Prevent duplicate memberships
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTable('study_group_members')
    .dropTable('study_groups');
};
