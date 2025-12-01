const knex = require('knex');
const config = require('./knexfile');

const db = knex(config.development);

async function checkTable() {
  try {
    const exists = await db.schema.hasTable('assignments');
    if (!exists) {
      console.log('Table "assignments" does not exist.');
      return;
    }

    const columns = await db('assignments').columnInfo();
    console.log('Columns in "assignments" table:');
    console.log(columns);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await db.destroy();
  }
}

checkTable();
