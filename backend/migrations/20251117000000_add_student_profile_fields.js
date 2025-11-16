/**
 * Migration: Add student profile fields to users table
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  // Check which columns already exist
  const hasColumn = async (tableName, columnName) => {
    const result = await knex.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ? AND column_name = ?
    `, [tableName, columnName]);
    return result.rows.length > 0;
  };

  // Add student profile fields to users table (only if they don't exist)
  const columnsToAdd = [];
  
  if (!(await hasColumn('users', 'interests'))) {
    columnsToAdd.push('interests');
  }
  if (!(await hasColumn('users', 'learning_goals'))) {
    columnsToAdd.push('learning_goals');
  }
  if (!(await hasColumn('users', 'date_of_birth'))) {
    columnsToAdd.push('date_of_birth');
  }
  
  // Only alter table if there are columns to add
  if (columnsToAdd.length > 0) {
    await knex.schema.table('users', function(table) {
      if (columnsToAdd.includes('interests')) {
        table.json('interests'); // Array of interest strings
      }
      if (columnsToAdd.includes('learning_goals')) {
        table.text('learning_goals'); // Text description of learning goals
      }
      if (columnsToAdd.includes('date_of_birth')) {
        table.date('date_of_birth'); // Date of birth
      }
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove student profile fields from users table
  await knex.schema.table('users', function(table) {
    table.dropColumn('interests');
    table.dropColumn('learning_goals');
    table.dropColumn('date_of_birth');
  });
};

