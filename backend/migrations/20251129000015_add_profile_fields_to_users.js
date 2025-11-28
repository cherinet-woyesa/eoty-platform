exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.text('bio').nullable();
    table.string('phone_number').nullable();
    table.string('location').nullable();
    table.jsonb('specialties').defaultTo('[]');
    table.string('teaching_experience').nullable();
    table.string('education').nullable();
    table.text('interests').nullable();
    table.text('learning_goals').nullable();
    table.date('date_of_birth').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('bio');
    table.dropColumn('phone_number');
    table.dropColumn('location');
    table.dropColumn('specialties');
    table.dropColumn('teaching_experience');
    table.dropColumn('education');
    table.dropColumn('interests');
    table.dropColumn('learning_goals');
    table.dropColumn('date_of_birth');
  });
};
