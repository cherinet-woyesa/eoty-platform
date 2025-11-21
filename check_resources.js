const db = require('./backend/config/database');

async function checkResources() {
  try {
    const result = await db('resources').count('* as count').first();
    console.log('Resources count:', result?.count || 0);

    if (parseInt(result?.count || 0) === 0) {
      console.log('No resources found, running seed...');
      const seed = require('./backend/seeds/012_resource_library_mock_data');
      await seed.seed(db);
      console.log('Seed completed');
    } else {
      console.log('Resources already exist');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkResources();


