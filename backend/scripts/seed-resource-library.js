/**
 * Script to seed Resource Library mock data
 * Run: node scripts/seed-resource-library.js
 */

const knex = require('../knexfile');
const seedFile = require('../seeds/012_resource_library_mock_data.js');

async function seedResourceLibrary() {
  try {
    console.log('🌱 Starting Resource Library seed...');
    
    const knexInstance = require('knex')(knex.development);
    
    await seedFile.seed(knexInstance);
    
    console.log('✅ Resource Library seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding Resource Library:', error);
    process.exit(1);
  }
}

seedResourceLibrary();


