/**
 * Create views for account and session tables with camelCase aliases for Better Auth compatibility
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create account view with camelCase column aliases
  await knex.raw(`
    CREATE OR REPLACE VIEW "account_view" AS 
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
    FROM account;
  `);
  console.log('✅ Created account_view with camelCase aliases');

  // Create session view with camelCase column aliases
  await knex.raw(`
    CREATE OR REPLACE VIEW "session_view" AS 
    SELECT 
      id,
      user_id AS "userId",
      expires_at AS "expiresAt",
      token,
      ip_address AS "ipAddress",
      user_agent AS "userAgent",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM session;
  `);
  console.log('✅ Created session_view with camelCase aliases');
};

/**
 * Rollback migration - removes views
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.raw(`DROP VIEW IF EXISTS "account_view";`);
  console.log('✅ Dropped account_view');
  
  await knex.raw(`DROP VIEW IF EXISTS "session_view";`);
  console.log('✅ Dropped session_view');
};
