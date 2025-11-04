/**
 * Better Auth Migration - Modifies users table for Better Auth compatibility
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if email_verified column already exists (it does from initial migration)
  const hasEmailVerified = await knex.schema.hasColumn('users', 'email_verified');
  if (!hasEmailVerified) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('email_verified').defaultTo(false);
    });
    console.log('✅ Added email_verified column to users table');
  } else {
    console.log('ℹ️ email_verified column already exists in users table');
  }

  // Add two_factor_enabled column
  const hasTwoFactorEnabled = await knex.schema.hasColumn('users', 'two_factor_enabled');
  if (!hasTwoFactorEnabled) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('two_factor_enabled').defaultTo(false);
    });
    console.log('✅ Added two_factor_enabled column to users table');
  } else {
    console.log('ℹ️ two_factor_enabled column already exists in users table');
  }

  // Add two_factor_secret column
  const hasTwoFactorSecret = await knex.schema.hasColumn('users', 'two_factor_secret');
  if (!hasTwoFactorSecret) {
    await knex.schema.alterTable('users', (table) => {
      table.text('two_factor_secret').nullable();
    });
    console.log('✅ Added two_factor_secret column to users table');
  } else {
    console.log('ℹ️ two_factor_secret column already exists in users table');
  }

  // Add migrated_to_better_auth column
  const hasMigratedFlag = await knex.schema.hasColumn('users', 'migrated_to_better_auth');
  if (!hasMigratedFlag) {
    await knex.schema.alterTable('users', (table) => {
      table.boolean('migrated_to_better_auth').defaultTo(false);
    });
    console.log('✅ Added migrated_to_better_auth column to users table');
  } else {
    console.log('ℹ️ migrated_to_better_auth column already exists in users table');
  }
};

/**
 * Rollback migration - removes Better Auth columns from users table
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Note: We don't remove email_verified as it existed before Better Auth
  
  // Remove two_factor_enabled column
  const hasTwoFactorEnabled = await knex.schema.hasColumn('users', 'two_factor_enabled');
  if (hasTwoFactorEnabled) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('two_factor_enabled');
    });
    console.log('✅ Removed two_factor_enabled column from users table');
  }

  // Remove two_factor_secret column
  const hasTwoFactorSecret = await knex.schema.hasColumn('users', 'two_factor_secret');
  if (hasTwoFactorSecret) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('two_factor_secret');
    });
    console.log('✅ Removed two_factor_secret column from users table');
  }

  // Remove migrated_to_better_auth column
  const hasMigratedFlag = await knex.schema.hasColumn('users', 'migrated_to_better_auth');
  if (hasMigratedFlag) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('migrated_to_better_auth');
    });
    console.log('✅ Removed migrated_to_better_auth column from users table');
  }
};
