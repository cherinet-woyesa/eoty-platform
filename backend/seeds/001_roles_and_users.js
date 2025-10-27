const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Get chapters
  const chapters = await knex('chapters').select('id');
  
  if (chapters.length === 0) {
    console.log('No chapters found. Please run seedChapters.js first.');
    return;
  }
  
  // Hash passwords
  const saltRounds = 12;
  const studentPassword = await bcrypt.hash('student123', saltRounds);
  const teacherPassword = await bcrypt.hash('teacher123', saltRounds);
  const chapterAdminPassword = await bcrypt.hash('chapter123', saltRounds);
  const platformAdminPassword = await bcrypt.hash('admin123', saltRounds);
  
  // Sample users for each role
  const users = [
    {
      first_name: 'Student',
      last_name: 'User',
      email: 'student@eoty.org',
      password_hash: studentPassword,
      role: 'student',
      chapter_id: chapters[0].id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      first_name: 'Teacher',
      last_name: 'User',
      email: 'teacher@eoty.org',
      password_hash: teacherPassword,
      role: 'teacher',
      chapter_id: chapters[0].id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      first_name: 'Chapter',
      last_name: 'Admin',
      email: 'chapter-admin@eoty.org',
      password_hash: chapterAdminPassword,
      role: 'chapter_admin',
      chapter_id: chapters[0].id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      first_name: 'Platform',
      last_name: 'Admin',
      email: 'admin@eoty.org',
      password_hash: platformAdminPassword, // password: admin123
      role: 'platform_admin',
      chapter_id: chapters[0].id,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  
  // Process each user
  for (const user of users) {
    const existingUser = await knex('users').where('email', user.email).first();
    if (!existingUser) {
      // User doesn't exist, create new
      await knex('users').insert(user);
      console.log(`Created user: ${user.email}`);
    } else {
      // User exists, update password
      await knex('users').where('email', user.email).update({
        password_hash: user.password_hash,
        updated_at: new Date()
      });
      console.log(`Updated password for user: ${user.email}`);
    }
  }
  
  console.log('Seed process completed');
};