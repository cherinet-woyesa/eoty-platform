exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('teachers');
  if (!exists) {
    return knex.schema.createTable('teachers', function(table) {
      table.increments('id').primary();
      table.integer('user_id').references('id').inTable('users').onDelete('CASCADE').notNullable().unique();
      table.text('bio');
      table.integer('experience_years').defaultTo(0);
      table.jsonb('qualifications').defaultTo('[]');
      table.jsonb('specializations').defaultTo('[]');
      table.jsonb('languages_taught').defaultTo('[]');
      table.string('profile_picture_url');
      table.jsonb('social_media_links').defaultTo('{}');
      table.enu('status', ['pending_verification', 'verified', 'active', 'inactive', 'suspended']).defaultTo('pending_verification');
      table.jsonb('onboarding_status').defaultTo('{}'); // Store progress of onboarding steps
      table.jsonb('verification_docs').defaultTo('{}'); // Store status of uploaded documents
      table.string('payout_method'); // e.g., 'bank_transfer', 'mobile_money'
      table.string('payout_region'); // e.g., 'US', 'ET'
      table.jsonb('payout_details').defaultTo('{}'); // Encrypted payout details
      table.string('tax_status'); // e.g., 'AGREED', 'PENDING'
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  }
};

exports.down = function(knex) {
  return knex.schema.dropTable('teachers');
};

