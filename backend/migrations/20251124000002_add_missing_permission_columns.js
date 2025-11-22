// Add missing columns to user_permissions table
exports.up = function(knex) {
  return knex.raw(`
    ALTER TABLE user_permissions
    ADD COLUMN IF NOT EXISTS name VARCHAR(100) DEFAULT 'Unknown Permission',
    ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general',
    ADD COLUMN IF NOT EXISTS description TEXT
  `);
};

exports.down = function(knex) {
  return knex.raw(`
    ALTER TABLE user_permissions
    DROP COLUMN IF EXISTS description,
    DROP COLUMN IF EXISTS category,
    DROP COLUMN IF EXISTS name
  `);
};
