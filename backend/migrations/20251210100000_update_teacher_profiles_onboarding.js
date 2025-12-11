exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('teacher_profiles');
  if (!hasTable) return;

  await knex.schema.alterTable('teacher_profiles', table => {
    table.jsonb('onboarding_status').defaultTo('{}');
    table.jsonb('verification_docs').defaultTo('{}');
    table.string('payout_region').nullable();
    table.string('payout_method').nullable();
    table.jsonb('payout_details').defaultTo('{}');
    table.string('tax_status').nullable();
  });
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('teacher_profiles');
  if (!hasTable) return;

  await knex.schema.alterTable('teacher_profiles', table => {
    table.dropColumn('onboarding_status');
    table.dropColumn('verification_docs');
    table.dropColumn('payout_region');
    table.dropColumn('payout_method');
    table.dropColumn('payout_details');
    table.dropColumn('tax_status');
  });
};




