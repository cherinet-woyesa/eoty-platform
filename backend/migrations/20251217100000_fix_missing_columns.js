exports.up = async function(knex) {
  // 1. Ensure teachers table exists and has profile_picture_url
  const hasTeachersTable = await knex.schema.hasTable('teachers');
  if (!hasTeachersTable) {
    await knex.schema.createTable('teachers', function(table) {
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
      table.jsonb('onboarding_status').defaultTo('{}');
      table.jsonb('verification_docs').defaultTo('{}');
      table.string('payout_method');
      table.string('payout_region');
      table.jsonb('payout_details').defaultTo('{}');
      table.string('tax_status');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
  } else {
    const hasProfilePictureUrl = await knex.schema.hasColumn('teachers', 'profile_picture_url');
    if (!hasProfilePictureUrl) {
      await knex.schema.alterTable('teachers', table => {
        table.string('profile_picture_url');
      });
    }
  }

  // 2. Ensure users table has profile_picture
  const hasProfilePicture = await knex.schema.hasColumn('users', 'profile_picture');
  if (!hasProfilePicture) {
    await knex.schema.alterTable('users', table => {
      table.string('profile_picture');
    });
  }
};

exports.down = async function(knex) {
  // We don't want to drop tables or columns in production usually, but for completeness:
  // This is a fix migration, so down might not be needed or should be careful.
  // Leaving empty to avoid accidental data loss on rollback.
};
