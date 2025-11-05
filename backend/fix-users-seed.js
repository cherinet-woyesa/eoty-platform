const knex = require('knex');
const knexConfig = require('./knexfile');
const bcrypt = require('bcryptjs');

const db = knex(knexConfig.development);

async function fixAndSeedUsers() {
  try {
    console.log('Fixing users table and seeding data...\n');
    
    // Check if chapters exist
    const chapters = await db('chapters').select('id').limit(1);
    
    if (chapters.length === 0) {
      console.log('❌ No chapters found. Please run: npx knex seed:run --specific=000_chapters.js');
      return;
    }
    
    const chapterId = chapters[0].id;
    console.log(`✅ Using chapter ID: ${chapterId}\n`);
    
    // Check current users table structure
    const tableInfo = await db.raw(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'id'
    `);
    
    console.log('Current ID column info:', tableInfo.rows[0]);
    console.log('⚠️  WARNING: ID column is TEXT, not INTEGER with auto-increment!\n');
    
    const saltRounds = 12;
    
    // Define test users
    const testUsers = [
      {
        first_name: 'Student',
        last_name: 'User',
        email: 'student@eoty.org',
        password: 'student123',
        role: 'student'
      },
      {
        first_name: 'Teacher',
        last_name: 'User',
        email: 'teacher@eoty.org',
        password: 'teacher123',
        role: 'teacher'
      },
      {
        first_name: 'Chapter',
        last_name: 'Admin',
        email: 'chapter-admin@eoty.org',
        password: 'chapter123',
        role: 'chapter_admin'
      },
      {
        first_name: 'Platform',
        last_name: 'Admin',
        email: 'admin@eoty.org',
        password: 'admin123',
        role: 'platform_admin'
      }
    ];
    
    console.log('Creating/updating users...\n');
    
    // Get next available ID
    const maxIdResult = await db.raw(`SELECT MAX(id::integer) as max_id FROM users WHERE id ~ '^[0-9]+$'`);
    let nextId = (maxIdResult.rows[0].max_id || 0) + 1;
    
    for (const user of testUsers) {
      const passwordHash = await bcrypt.hash(user.password, saltRounds);
      
      // Check if user already exists
      const existing = await db('users').where('email', user.email).first();
      
      if (existing) {
        // Update existing user
        await db('users').where('email', user.email).update({
          password_hash: passwordHash,
          is_active: true,
          updated_at: new Date()
        });
        console.log(`✅ Updated: ${user.email} (${user.role})`);
      } else {
        // Insert new user with explicit TEXT ID
        await db('users').insert({
          id: nextId.toString(),
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          password_hash: passwordHash,
          role: user.role,
          chapter_id: chapterId,
          is_active: true,
          email_verified: true,
          created_at: new Date(),
          updated_at: new Date()
        });
        console.log(`✅ Created: ${user.email} (${user.role}) with ID: ${nextId}`);
        nextId++;
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Test User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    testUsers.forEach(user => {
      console.log(`Email: ${user.email.padEnd(25)} | Password: ${user.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('✅ All done! You can now login with any of the above credentials.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await db.destroy();
  }
}

fixAndSeedUsers();
