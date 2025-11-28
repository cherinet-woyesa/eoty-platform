const knex = require('./knexfile');
const db = require('knex')(knex.development);

async function check() {
  try {
    const providers = await db('sso_providers').select('*');
    console.log('SSO Providers:', providers);
    
    const categories = await db('course_categories').select('*');
    console.log('Course Categories count:', categories.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
