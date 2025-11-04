/**
 * Add email to account view for Better Auth credential authentication
 * Better Auth needs to find credential accounts by email
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('📝 Updating account view to include email...');
  
  // Drop and recreate the account view with email from users table
  await knex.raw(`DROP VIEW IF EXISTS "account" CASCADE`);
  
  await knex.raw(`
    CREATE OR REPLACE VIEW "account" AS 
    SELECT 
      a.id,
      a.user_id AS "userId",
      a.account_id AS "accountId",
      a.provider,
      a.password,
      a.access_token AS "accessToken",
      a.refresh_token AS "refreshToken",
      a.expires_at AS "expiresAt",
      a.scope,
      a.created_at AS "createdAt",
      a.updated_at AS "updatedAt",
      u.email AS "email"
    FROM account_table a
    LEFT JOIN users u ON a.user_id = u.id;
  `);
  
  console.log('✅ Account view updated with email column');
};

/**
 * Rollback migration
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Recreate view without email
  await knex.raw(`DROP VIEW IF EXISTS "account" CASCADE`);
  
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
  
  console.log('✅ Rolled back account view');
};
