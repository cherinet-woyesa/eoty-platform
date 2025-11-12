/**
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

  // Add teacher profile fields to users table (only if they don't exist)
  const columnsToAdd = [];
  
  if (!(await hasColumn('users', 'phone'))) {
    columnsToAdd.push('phone');
  }
  if (!(await hasColumn('users', 'location'))) {
    columnsToAdd.push('location');
  }
  if (!(await hasColumn('users', 'education'))) {
    columnsToAdd.push('education');
  }
  if (!(await hasColumn('users', 'teaching_experience'))) {
    columnsToAdd.push('teaching_experience');
  }
  if (!(await hasColumn('users', 'specialties'))) {
    columnsToAdd.push('specialties');
  }
  
  // Only alter table if there are columns to add
  if (columnsToAdd.length > 0) {
    await knex.schema.table('users', function(table) {
      if (columnsToAdd.includes('phone')) {
        table.string('phone');
      }
      if (columnsToAdd.includes('location')) {
        table.string('location');
      }
      if (columnsToAdd.includes('education')) {
        table.text('education');
      }
      if (columnsToAdd.includes('teaching_experience')) {
        table.integer('teaching_experience');
      }
      if (columnsToAdd.includes('specialties')) {
        table.json('specialties');
      }
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  // Remove teacher profile fields from users table
  await knex.schema.table('users', function(table) {
    table.dropColumn('phone');
    table.dropColumn('location');
    table.dropColumn('education');
    table.dropColumn('teaching_experience');
    table.dropColumn('specialties');
  });
};