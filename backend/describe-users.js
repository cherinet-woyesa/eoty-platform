const db = require('./config/database');

async function describeUsers() {
  try {
    const columns = await db('information_schema.columns')
      .where({ table_name: 'users' })
      .select('column_name', 'data_type');
    console.table(columns);
  } catch (error) {
    console.error('Error describing users table:', error);
  } finally {
    db.destroy();
  }
}

describeUsers();
