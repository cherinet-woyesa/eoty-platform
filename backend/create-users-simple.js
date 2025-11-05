const knex = require('knex');
const knexConfig = require('./knexfile');
const bcrypt = require('bcryptjs');

const db = knex(knexConfig.development);

async function createUsers() {
  try {
    console.log('Creating test users...\n');
    
    // Check if chapters exist
    const chapters = await db('chapters').select('id').limit(1);
    
    if (chapters.length === 0) {
      console.log('Creating default chapter...');
      await db('chapters').insert({
        id: '1',
        name: 'Default Chapter',
        location: 'Default Location',
        created_at: new Date(),
        updated_at: new Date()
      });
      console.log('✅ Default chapter created\n');
      chapters.push({ id: '1' });
    }
    
    const chapterId = chapters[0].id;
    
    const saltRounds = 12;
    
    // Define test users with explicit text IDs
    const testUsers = [
      {
        id: '1',
        first_name: 'Student',
        last_name: 'User',
        email: 'student@eoty.org',
        password: 'student123',
        role: 'student'
      },
      {
        id: '2',
        first_name: 'Teacher',
        last_name: 'User',
        email: 'teacher@eoty.org',
        password: 'teacher123',
        role: 'teacher'
      },
      {
        id: '3',
        first_name: 'Chapter',
        last_name: 'Admin',
        email: 'chapter-admin@eoty.org',
        password: 'chapter123',
        role: 'chapter_admin'
      },
      {
        id: '4',
        first_name: 'Platform',
        last_name: 'Admin',
        email: 'admin@eoty.org',
        password: 'admin123',
        role: 'platform_admin'
      }
    ];
    
    console.log('Creating users...\n');
    
    for (const user of testUsers) {
      const passwordHash = await bcrypt.hash(user.password, saltRounds);
      
      // Check if user already exists
      const existing = await db('users').where('email', user.email).first();
      
      if (existing) {
        console.log(`⚠️  User already exists: ${user.email} - skipping`);
        continue;
      }
      
      await db('users').insert({
        id: user.id,
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
      
      console.log(`✅ Created: ${user.email} (${user.role})`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Test User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    testUsers.forEach(user => {
      console.log(`Email: ${user.email.padEnd(25)} | Password: ${user.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('⚠️  WARNING: Your users table has TEXT id columns instead of INTEGER.');
    console.log('This will cause issues. Consider running: npx knex migrate:rollback --all');
    console.log('Then: npx knex migrate:latest\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.destroy();
  }
}

createUsers();
