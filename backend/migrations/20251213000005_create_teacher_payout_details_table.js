exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('teacher_payout_details');
  if (!exists) {
    return knex.schema.createTable('teacher_payout_details', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('teacher_id').references('id').inTable('teachers').onDelete('CASCADE').notNullable();
      table.string('country').notNullable();
      table.string('payout_method').notNullable();
      table.string('account_holder_name');
      table.text('mobile_money_account_number'); // Encrypted
      table.string('bank_name');
      table.text('bank_account_number'); // Encrypted
      table.text('routing_number'); // Encrypted
      table.jsonb('mfa_details').defaultTo('{}'); // Encrypted
      table.jsonb('tax_information').defaultTo('{}'); // Encrypted
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      table.unique(['teacher_id']);
    });
  }
};

exports.down = function(knex) {
  return knex.schema.dropTable('teacher_payout_details');
};

