const knex = require('knex');

const db = knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'Cherinet4!',
    database: 'eoty-platform'
  }
});

async function checkColumns() {
  try {
    const columns = await db('user_course_enrollments').columnInfo();
    console.log('user_course_enrollments columns:', Object.keys(columns));
  } catch (error) {
    console.error('Error checking columns:', error);
  } finally {
    process.exit();
  }
}

checkColumns();
