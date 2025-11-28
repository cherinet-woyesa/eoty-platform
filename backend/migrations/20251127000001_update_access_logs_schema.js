/**
 * Migration: Update access_logs table schema to match current service requirements
 */
exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('access_logs');

  if (exists) {
    // Add missing columns if they don't exist
    const hasUserRole = await knex.schema.hasColumn('access_logs', 'user_role');
    if (!hasUserRole) {
      await knex.schema.alterTable('access_logs', function(table) {
        table.string('user_role').nullable();
      });
    }

    const hasResource = await knex.schema.hasColumn('access_logs', 'resource');
    if (!hasResource) {
      await knex.schema.alterTable('access_logs', function(table) {
        table.string('resource').nullable();
      });
    }

    const hasRequiredRole = await knex.schema.hasColumn('access_logs', 'required_role');
    if (!hasRequiredRole) {
      await knex.schema.alterTable('access_logs', function(table) {
        table.string('required_role').nullable();
      });
    }

    const hasAction = await knex.schema.hasColumn('access_logs', 'action');
    if (!hasAction) {
      await knex.schema.alterTable('access_logs', function(table) {
        table.string('action').defaultTo('access');
      });
    }

    const hasAccessGranted = await knex.schema.hasColumn('access_logs', 'access_granted');
    if (!hasAccessGranted) {
      await knex.schema.alterTable('access_logs', function(table) {
        table.boolean('access_granted').defaultTo(true);
      });
    }

    const hasIpAddress = await knex.schema.hasColumn('access_logs', 'ip_address');
    if (!hasIpAddress) {
      await knex.schema.alterTable('access_logs', function(table) {
        table.string('ip_address').nullable();
      });
    }

    const hasUserAgent = await knex.schema.hasColumn('access_logs', 'user_agent');
    if (!hasUserAgent) {
      await knex.schema.alterTable('access_logs', function(table) {
        table.text('user_agent').nullable();
      });
    }

    const hasMetadata = await knex.schema.hasColumn('access_logs', 'metadata');
    if (!hasMetadata) {
      await knex.schema.alterTable('access_logs', function(table) {
        table.jsonb('metadata').nullable();
      });
    }

    // Make path nullable to prevent constraint violations
    await knex.raw('ALTER TABLE access_logs ALTER COLUMN path DROP NOT NULL');
  }

  return Promise.resolve();
};

exports.down = async function(knex) {
  // This is a schema update migration, no need for down migration
  return Promise.resolve();
};
