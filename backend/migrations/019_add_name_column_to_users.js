/**
 * Add name column to users table for Better Auth compatibility
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check if name column already exists
  const hasName = await knex.schema.hasColumn('users', 'name');
  
  if (!hasName) {
    await knex.schema.alterTable('users', (table) => {
      table.string('name').nullable();
    });
    console.log('✅ Added name column to users table');
    
    // Populate name column with first_name + last_name for existing users
    await knex.raw(`
      UPDATE users 
      SET name = CONCAT(first_name, ' ', last_name) 
      WHERE name IS NULL AND first_name IS NOT NULL
    `);
    console.log('✅ Populated name column for existing users');
  } else {
    console.log('ℹ️ name column already exists in users table');
  }
};

/**
 * Rollback migration - removes name column from users table
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  const hasName = await knex.schema.hasColumn('users', 'name');
  
  if (hasName) {
    await knex.schema.alterTable('users', (table) => {
      table.dropColumn('name');
    });
    console.log('✅ Removed name column from users table');
  }
};
