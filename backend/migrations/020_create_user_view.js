/**
 * Create a view named 'user' that points to 'users' table for Better Auth compatibility
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Create a view that Better Auth can use with camelCase column aliases
  await knex.raw(`
    CREATE OR REPLACE VIEW "user" AS 
    SELECT 
      id,
      email,
      password_hash AS password,
      name,
      email_verified AS "emailVerified",
      profile_picture AS image,
      created_at AS "createdAt",
      updated_at AS "updatedAt",
      first_name,
      last_name,
      role,
      chapter_id,
      profile_picture,
      is_active,
      two_factor_enabled,
      two_factor_secret,
      migrated_to_better_auth
    FROM users;
  `);
  console.log('✅ Created user view with camelCase aliases pointing to users table');
};

/**
 * Rollback migration - removes user view
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  await knex.raw(`DROP VIEW IF EXISTS "user";`);
  console.log('✅ Dropped user view');
};
