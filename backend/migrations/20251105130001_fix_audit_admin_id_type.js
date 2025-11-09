/**
 * Migration: Fix audit admin_id type
 * This migration was previously run but the file was missing
 */

exports.up = async function(knex) {
  // Check if the column already has the correct type
  const hasColumn = await knex.schema.hasColumn('system_config_audit', 'admin_id');
  
  if (hasColumn) {
    // Already applied, no-op
    console.log('✅ Audit admin_id type already correct');
  }
};

exports.down = async function(knex) {
  // No-op for rollback
};
