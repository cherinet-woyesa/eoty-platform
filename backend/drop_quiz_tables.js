const db = require('./config/database');

async function dropTables() {
  try {
    console.log('Dropping quiz tables...');
    await db.schema.dropTableIfExists('quiz_sessions');
    await db.schema.dropTableIfExists('quiz_attempts');
    await db.schema.dropTableIfExists('quiz_questions');
    await db.schema.dropTableIfExists('quizzes');
    console.log('Dropped quiz tables');
    
    console.log('Removing migration records...');
    await db('knex_migrations')
      .where('name', 'like', '%005_quizzes_assessments.js%')
      .orWhere('name', 'like', '%018_create_quiz_questions.js%')
      .del();
    console.log('Removed migration records');
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

dropTables();
