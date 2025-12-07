const db = require('./config/database');

async function describeTable() {
  try {
    const columns = await db('community_posts').columnInfo();
    console.log('community_posts columns:', columns);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

describeTable();
