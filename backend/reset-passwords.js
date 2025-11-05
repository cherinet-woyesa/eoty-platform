const knex = require('knex');
const knexConfig = require('./knexfile');
const bcrypt = require('bcryptjs');

const db = knex(knexConfig.development);

async function resetPasswords() {
  try {
    console.log('Resetting user passwords...\n');
    
    const saltRounds = 12;
    
    // Define users and their passwords
    const userPasswords = [
      { email: 'student@eoty.org', password: 'student123', role: 'student' },
      { email: 'teacher@eoty.org', password: 'teacher123', role: 'teacher' },
      { email: 'chapter-admin@eoty.org', password: 'chapter123', role: 'chapter_admin' },
      { email: 'admin@eoty.org', password: 'admin123', role: 'platform_admin' }
    ];
    
    for (const user of userPasswords) {
      const passwordHash = await bcrypt.hash(user.password, saltRounds);
      
      // Check if user exists
      const existingUser = await db('users').where('email', user.email).first();
      
      if (existingUser) {
        // Update password
        await db('users')
          .where('email', user.email)
          .update({
            password_hash: passwordHash,
            updated_at: new Date()
          });
        console.log(`✅ Updated password for: ${user.email} (${user.role})`);
      } else {
        console.log(`⚠️  User not found: ${user.email} - skipping`);
      }
    }
    
    console.log('\n📋 Current test user credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email: student@eoty.org       | Password: student123');
    console.log('Email: teacher@eoty.org       | Password: teacher123');
    console.log('Email: chapter-admin@eoty.org | Password: chapter123');
    console.log('Email: admin@eoty.org         | Password: admin123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('Error resetting passwords:', error.message);
  } finally {
    await db.destroy();
  }
}

resetPasswords();
