const knex = require('knex');
const knexConfig = require('./knexfile');
const bcrypt = require('bcryptjs');

const db = knex(knexConfig.development);

async function createTestUsers() {
  try {
    console.log('Creating test users...\n');
    
    // Check if chapters exist
    const chapters = await db('chapters').select('id').limit(1);
    
    if (chapters.length === 0) {
      console.log('⚠️  No chapters found. Creating a default chapter first...');
      const [chapterId] = await db('chapters').insert({
        name: 'Default Chapter',
        location: 'Default Location',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('id');
      
      console.log(`✅ Created default chapter with ID: ${chapterId.id || chapterId}\n`);
      chapters.push(chapterId);
    }
    
    const chapterId = chapters[0].id || chapters[0];
    
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
    
    console.log('Creating users...\n');
    
    for (const user of testUsers) {
      const passwordHash = await bcrypt.hash(user.password, saltRounds);
      
      // Use raw SQL to insert with DEFAULT for id
      await db.raw(`
        INSERT INTO users (first_name, last_name, email, password_hash, role, chapter_id, is_active, email_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        user.first_name,
        user.last_name,
        user.email,
        passwordHash,
        user.role,
        chapterId,
        true,
        true
      ]);
      
      console.log(`✅ Created: ${user.email} (${user.role})`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Test User Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    testUsers.forEach(user => {
      console.log(`Email: ${user.email.padEnd(25)} | Password: ${user.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ Error creating users:', error.message);
  } finally {
    await db.destroy();
  }
}

createTestUsers();
