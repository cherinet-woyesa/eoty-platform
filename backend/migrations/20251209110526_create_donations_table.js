/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('donations', function(table) {
    table.increments('id').primary();
    table.decimal('amount', 10, 2).notNullable();
    table.string('currency', 3).defaultTo('USD');
    table.string('donor_name', 255);
    table.string('donor_email', 255);
    table.string('payment_intent_id', 255);
    table.string('status', 50).defaultTo('pending');
    table.string('payment_method', 50);
    table.boolean('is_anonymous').defaultTo(false);
    table.timestamps(true, true);
  }).then(function() {
    // Seed initial data
    return knex('donations').insert([
      { amount: 5000.00, donor_name: 'Initial Seed', status: 'succeeded', created_at: knex.raw("NOW() - INTERVAL '5 days'") },
      { amount: 25000.00, donor_name: 'Corporate Sponsor', status: 'succeeded', created_at: knex.raw("NOW() - INTERVAL '10 days'") },
      { amount: 45000.00, donor_name: 'Community Fund', status: 'succeeded', created_at: knex.raw("NOW() - INTERVAL '2 days'") }
    ]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('donations');
};
