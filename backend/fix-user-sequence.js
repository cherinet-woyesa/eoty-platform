const db = require('./config/database');

async function fixUserSequence() {
  try {
    console.log('Checking users table...');
    
    // Get the current max ID
    const result = await db('users').max('id as maxId').first();
    const maxId = result.maxId || 0;
    
    console.log(`Current max user ID: ${maxId}`);
    
    // Reset the sequence to start after the max ID
    const newSeqValue = maxId + 1;
    await db.raw(`ALTER SEQUENCE users_id_seq RESTART WITH ${newSeqValue}`);
    
    console.log(`✅ Sequence reset to ${newSeqValue}`);
    
    // Get chapters for user creation
    const chapters = await db('chapters').select('id', 'name').limit(1);
    
    if (chapters.length === 0) {
      console.log('❌ No chapters found. Please seed chapters first.');
      process.exit(1);
    }
    
    const chapterId = chapters[0].id;
    console.log(`Using chapter ID: ${chapterId}`);
    
    // Check if test users exist
    const existingUsers = await db('users')
      .whereIn('email', ['student@eoty.org', 'teacher@eoty.org', 'chapter-admin@eoty.org', 'admin@eoty.org'])
      .select('email');
    
    console.log(`Found ${existingUsers.length} existing test users`);
    
    if (existingUsers.length === 0) {
      console.log('Creating test users...');
      const bcrypt = require('bcryptjs');
      
      const users = [
        {
          first_name: 'Test',
          last_name: 'Student',
          email: 'student@eoty.org',
          password_hash: await bcrypt.hash('student123', 12),
          role: 'student',
          chapter_id: chapterId,
          is_active: true,
          email_verified: true
        },
        {
          first_name: 'Test',
          last_name: 'Teacher',
          email: 'teacher@eoty.org',
          password_hash: await bcrypt.hash('teacher123', 12),
          role: 'teacher',
          chapter_id: chapterId,
          is_active: true,
          email_verified: true
        },
        {
          first_name: 'Chapter',
          last_name: 'Admin',
          email: 'chapter-admin@eoty.org',
          password_hash: await bcrypt.hash('chapter123', 12),
          role: 'chapter_admin',
          chapter_id: chapterId,
          is_active: true,
          email_verified: true
        },
        {
          first_name: 'Platform',
          last_name: 'Admin',
          email: 'admin@eoty.org',
          password_hash: await bcrypt.hash('admin123', 12),
          role: 'platform_admin',
          chapter_id: chapterId,
          is_active: true,
          email_verified: true
        }
      ];
      
      await db('users').insert(users);
      console.log('✅ Test users created successfully');
    }
    
    console.log('\n📋 Test user credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: student@eoty.org       | Password: student123');
    console.log('Email: teacher@eoty.org       | Password: teacher123');
    console.log('Email: chapter-admin@eoty.org | Password: chapter123');
    console.log('Email: admin@eoty.org         | Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixUserSequence();
