const knex = require('knex')(require('./knexfile').development);

async function checkChapters() {
  try {
    const exists = await knex.schema.hasTable('chapters');
    console.log(`Table 'chapters' exists: ${exists}`);

    if (exists) {
      const chapters = await knex('chapters').select('*');
      console.log('Chapters:', chapters);
    } else {
        console.log('Chapters table does not exist.');
    }
  } catch (error) {
    console.error('Error checking chapters:', error);
  } finally {
    process.exit(0);
  }
}

checkChapters();
