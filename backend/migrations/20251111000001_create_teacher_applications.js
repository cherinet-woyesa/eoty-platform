/**
 * Migration: Create teacher_applications table
 * for managing teacher role applications
 * 
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  await knex.schema.createTable('teacher_applications', function(table) {
    table.increments('id').primary();
    table.text('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    
    // Application details
    table.text('application_text').notNullable(); // Why they want to teach
    table.text('qualifications').notNullable(); // Educational background, certifications
    table.text('experience'); // Teaching experience
    table.jsonb('subject_areas'); // Areas of interest/expertise (stored as JSON array)
    
    // Application status
    table.string('status').defaultTo('pending').notNullable(); // pending, approved, rejected
    table.text('admin_notes'); // Admin review notes
    
    // Review information
    table.text('reviewed_by').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('reviewed_at');
    
    table.timestamps(true, true);
    
    // Indexes for efficient queries
    table.index(['user_id']);
    table.index(['status']);
    table.index(['status', 'created_at']);
    table.index(['reviewed_by']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('teacher_applications');
};

