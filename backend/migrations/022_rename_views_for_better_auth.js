/**
 * Rename views to match Better Auth's expected table names
 * Drop the actual tables and use views instead
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Drop existing views
  await knex.raw(`DROP VIEW IF EXISTS "account_view";`);
  await knex.raw(`DROP VIEW IF EXISTS "session_view";`);
  console.log('✅ Dropped old views');
  
  // Rename actual tables to have _table suffix
  await knex.schema.renameTable('account', 'account_table');
  await knex.schema.renameTable('session', 'session_table');
  console.log('✅ Renamed actual tables');
  
  // Create views with Better Auth expected names and camelCase columns
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
  console.log('✅ Created account view');

  await knex.raw(`
    CREATE OR REPLACE VIEW "session" AS 
    SELECT 
      id,
      user_id AS "userId",
      expires_at AS "expiresAt",
      token,
      ip_address AS "ipAddress",
      user_agent AS "userAgent",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM session_table;
  `);
  console.log('✅ Created session view');
  
  // Create INSTEAD OF triggers to make views writable
  await knex.raw(`
    CREATE OR REPLACE FUNCTION account_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO account_table (id, user_id, account_id, provider, access_token, refresh_token, expires_at, scope, created_at, updated_at)
      VALUES (NEW.id, NEW."userId", NEW."accountId", NEW.provider, NEW."accessToken", NEW."refreshToken", NEW."expiresAt", NEW.scope, NEW."createdAt", NEW."updatedAt");
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER account_insert_trigger
    INSTEAD OF INSERT ON account
    FOR EACH ROW
    EXECUTE FUNCTION account_insert();
  `);
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION session_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO session_table (id, user_id, expires_at, token, ip_address, user_agent, created_at, updated_at)
      VALUES (NEW.id, NEW."userId", NEW."expiresAt", NEW.token, NEW."ipAddress", NEW."userAgent", NEW."createdAt", NEW."updatedAt");
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER session_insert_trigger
    INSTEAD OF INSERT ON session
    FOR EACH ROW
    EXECUTE FUNCTION session_insert();
  `);
  
  await knex.raw(`
    CREATE OR REPLACE FUNCTION session_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      DELETE FROM session_table WHERE id = OLD.id;
      RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER session_delete_trigger
    INSTEAD OF DELETE ON session
    FOR EACH ROW
    EXECUTE FUNCTION session_delete();
  `);
  
  console.log('✅ Created INSTEAD OF triggers for writable views');
};

/**
 * Rollback migration
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Drop triggers and functions
  await knex.raw(`DROP TRIGGER IF EXISTS account_insert_trigger ON account;`);
  await knex.raw(`DROP FUNCTION IF EXISTS account_insert();`);
  await knex.raw(`DROP TRIGGER IF EXISTS session_insert_trigger ON session;`);
  await knex.raw(`DROP FUNCTION IF EXISTS session_insert();`);
  await knex.raw(`DROP TRIGGER IF EXISTS session_delete_trigger ON session;`);
  await knex.raw(`DROP FUNCTION IF EXISTS session_delete();`);
  
  // Drop views
  await knex.raw(`DROP VIEW IF EXISTS "account";`);
  await knex.raw(`DROP VIEW IF EXISTS "session";`);
  
  // Rename tables back
  await knex.schema.renameTable('account_table', 'account');
  await knex.schema.renameTable('session_table', 'session');
  
  console.log('✅ Rolled back view changes');
};
