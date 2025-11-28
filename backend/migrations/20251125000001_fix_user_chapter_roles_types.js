/**
 * Fix user_chapter_roles table type mismatches
 * users.id is TEXT, not INTEGER
 */

exports.up = function(knex) {
  return knex.schema.hasTable('user_chapter_roles').then(function(exists) {
    if (exists) {
      // Fix type mismatches - users.id is text, not integer
      return knex.raw(`
        ALTER TABLE user_chapter_roles
        ALTER COLUMN user_id TYPE TEXT,
        ALTER COLUMN assigned_by TYPE TEXT
      `);
    }
  });
};

exports.down = function(knex) {
  return knex.schema.hasTable('user_chapter_roles').then(function(exists) {
    if (exists) {
      // Revert back to integer types
      return knex.raw(`
        ALTER TABLE user_chapter_roles
        ALTER COLUMN user_id TYPE INTEGER USING user_id::INTEGER,
        ALTER COLUMN assigned_by TYPE INTEGER USING assigned_by::INTEGER
      `);
    }
  });
};
