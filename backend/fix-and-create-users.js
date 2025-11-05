const knex = require('knex');
const knexConfig = require('./knexfile');
const bcrypt = require('bcryptjs');

const db = knex(knexConfig.development);

async function fixAndCreateUsers() {
  try {
    console.log('Fixing database sequences and creating test users...\n');
    
    // Check the id column type and fix if needed
    console.log('Checking users table structure...');
    const columnInfo = await db.raw(`
      SELECT data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'id';
    `);
    console.log('ID column info:', columnInfo.rows[0]);
    
    // Fix the users table sequence
    console.log('Fixing users_id_seq sequence...');
    await db.raw(`
      SELECT setval('users_id_seq', COALESCE((SELECT MAX(id::integer) FROM users), 0) + 1, false);
    `);
    console.log('✅ Sequence fixed\n');
    
    // Check if chapters exist
    const chapters = await db('chapters').select('id').limit(1);
    
    if (chapters.length === 0) {
      console.log('Creating default chapter...');
      await db.raw(`
        INSERT INTO chapters (name, location, created_at, updated_at)
        VALUES ('Default Chapter', 'Default Location', NOW(), NOW())
      `);
      const newChapters = await db('chapters').select('id').limit(1);
      chapters.push(newChapters[0]);
      console.log('✅ Default chapter created\n');
    }
    
    const chapterId = chapters[0].id;
    
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
      
      // Check if user already exists
      const existing = await db('users').where('email', user.email).first();
      
      if (existing) {
        console.log(`⚠️  User already exists: ${user.email} - skipping`);
        continue;
      }
      
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
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await db.destroy();
  }
}

fixAndCreateUsers();
