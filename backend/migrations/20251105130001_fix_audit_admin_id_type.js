/**
 * Migration: Fix admin_id type in system_config_audit to match users.id (text)
 */

exports.up = async function(knex) {
  await knex.schema.alterTable('system_config_audit', function(table) {
    table.text('admin_id').notNullable().alter();
  });
  
  console.log('✓ Changed system_config_audit.admin_id to text type');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('system_config_audit', function(table) {
    table.integer('admin_id').notNullable().alter();
  });
  
  console.log('✓ Reverted system_config_audit.admin_id to integer type');
};
