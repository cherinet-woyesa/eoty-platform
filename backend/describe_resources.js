const knex = require('knex')(require('./knexfile').development);

async function describeResources() {
  try {
    const info = await knex('resources').columnInfo();
    console.log('Resources table info:', info);
  } catch (error) {
    console.error('Error describing resources:', error);
  } finally {
    process.exit(0);
  }
}

describeResources();
