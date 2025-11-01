
require('dotenv').config();
const db = require('./config/database');

const lessonId = 23;

console.log(`Querying for lesson with id: ${lessonId}`);

db('lessons')
  .where({ id: lessonId })
  .select('*')
  .first()
  .then(lesson => {
    if (lesson) {
      console.log('Lesson found:');
      console.log(lesson);
    } else {
      console.log('Lesson not found.');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Error querying database:', err);
    process.exit(1);
  });
