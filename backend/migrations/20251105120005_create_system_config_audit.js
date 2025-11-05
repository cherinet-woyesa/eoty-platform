/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create system_config_audit table
  await knex.schema.createTable('system_config_audit', function(table) {
    table.increments('id').primary();
    table.integer('admin_id').notNullable();
    table.string('entity_type', 50).notNullable();
    table.integer('entity_id').notNullable();
    table.string('action_type', 20).notNullable();
    table.jsonb('before_state');
    table.jsonb('after_state');
    table.string('ip_address', 45);
    table.text('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index(['entity_type', 'entity_id'], 'idx_audit_entity');
    table.index(['admin_id', 'created_at'], 'idx_audit_admin');
    table.index(['created_at'], 'idx_audit_created');
  });

  console.log('✓ Created system_config_audit table');
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('system_config_audit');
  console.log('✓ Dropped system_config_audit table');
};
