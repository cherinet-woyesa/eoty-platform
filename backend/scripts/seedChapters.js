const knex = require('knex');
const knexConfig = require('../knexfile');

// Initialize knex with the development configuration
const db = knex(knexConfig.development);

async function seedChapters() {
  try {
    console.log('Seeding chapters...');
    
    // Check if chapters already exist
    const existingChapters = await db('chapters').count('id as count').first();
    const chapterCount = parseInt(existingChapters.count);
    
    if (chapterCount > 0) {
      console.log('Chapters already exist. Skipping seeding.');
      return;
    }
    
    // Sample chapters
    const chapters = [
      {
        name: 'addis-ababa',
        location: 'Addis Ababa, Ethiopia',
        description: 'Main chapter in the capital city of Ethiopia',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'toronto',
        location: 'Toronto, Canada',
        description: 'Chapter serving the Ethiopian Orthodox community in Toronto',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'washington-dc',
        location: 'Washington DC, USA',
        description: 'Chapter serving the Ethiopian Orthodox community in the Washington DC area',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'london',
        location: 'London, UK',
        description: 'Chapter serving the Ethiopian Orthodox community in London',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    // Insert chapters
    const insertedChapters = await db('chapters').insert(chapters).returning('*');
    console.log('Successfully inserted chapters:', insertedChapters.length);
    
    // Create a default admin user
    const adminUser = {
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@eoty.org',
      password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.S', // password: admin123
      role: 'platform_admin',
      chapter_id: insertedChapters[0].id, // assign to first chapter
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    await db('users').insert(adminUser);
    console.log('Default admin user created');
    
  } catch (error) {
    console.error('Seeding failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await db.destroy();
  }
}

seedChapters();