/**
 * Add password column to account_table for Better Auth credential authentication
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('📝 Adding password column to account_table...');
  
  // Add password column to account_table
  await knex.schema.table('account_table', function(table) {
    table.text('password');
  });
  
  console.log('✅ Password column added to account_table');
  
  // Update the account view to include password
  await knex.raw(`
    DROP VIEW IF EXISTS "account" CASCADE;
  `);
  
  await knex.raw(`
    CREATE OR REPLACE VIEW "account" AS 
    SELECT 
      id,
      user_id AS "userId",
      account_id AS "accountId",
      provider,
      password,
      access_token AS "accessToken",
      refresh_token AS "refreshToken",
      expires_at AS "expiresAt",
      scope,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM account_table;
  `);
  
  console.log('✅ Account view updated with password column');
};

/**
 * Rollback migration
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove password column
  await knex.schema.table('account_table', function(table) {
    table.dropColumn('password');
  });
  
  // Recreate view without password
  await knex.raw(`
    DROP VIEW IF EXISTS "account" CASCADE;
  `);
  
  await knex.raw(`
    CREATE OR REPLACE VIEW "account" AS 
    SELECT 
      id,
      user_id AS "userId",
      account_id AS "accountId",
      provider,
      access_token AS "accessToken",
      refresh_token AS "refreshToken",
      expires_at AS "expiresAt",
      scope,
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM account_table;
  `);
  
  console.log('✅ Rolled back password column');
};
