exports.up = function(knex) {
  return knex.schema.alterTable('teachers', function(table) {
    // Spiritual Background Fields
    table.text('spiritual_tradition').nullable(); // e.g., 'Christianity', 'Islam', 'Buddhism', etc.
    table.text('denomination').nullable(); // e.g., 'Catholic', 'Protestant', 'Orthodox', etc.
    table.string('ordination_status').nullable(); // e.g., 'ordained', 'licensed', 'lay_minister'
    table.text('ministry_experience').nullable(); // Description of ministry experience
    
    // Teaching Approach Fields
    table.text('teaching_methodology').nullable(); // How they teach spiritual content
    table.jsonb('target_audience').defaultTo('[]'); // Target audience types
    table.string('preferred_class_size').nullable(); // 'small', 'medium', 'large', 'any'
    table.text('teaching_style').nullable(); // Teaching style description
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('teachers', function(table) {
    table.dropColumn('spiritual_tradition');
    table.dropColumn('denomination');
    table.dropColumn('ordination_status');
    table.dropColumn('ministry_experience');
    table.dropColumn('teaching_methodology');
    table.dropColumn('target_audience');
    table.dropColumn('preferred_class_size');
    table.dropColumn('teaching_style');
  });
};
