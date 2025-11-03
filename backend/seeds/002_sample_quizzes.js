const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  // Get chapters
  const chapters = await knex('chapters').select('id');
  
  if (chapters.length === 0) {
    console.log('No chapters found. Please run seed 000_chapters first.');
    return;
  }
  
  // Hash passwords
  const saltRounds = 12;
  const studentPassword = await bcrypt.hash('student123', saltRounds);
  const teacherPassword = await bcrypt.hash('teacher123', saltRounds);
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  
  // Sample users - using role names that match your migrations (admin, teacher, student)
  const users = [
    {
      first_name: 'Student',
      last_name: 'User',
      email: 'student@eoty.org',
      password_hash: studentPassword,
      role: 'student', // Changed to match migrations
      chapter_id: chapters[0].id,
      is_active: true,
      email_verified: true
    },
    {
      first_name: 'Teacher',
      last_name: 'User',
      email: 'teacher@eoty.org',
      password_hash: teacherPassword,
      role: 'teacher', // Changed to match migrations
      chapter_id: chapters[0].id,
      is_active: true,
      email_verified: true
    },
    {
      first_name: 'Platform',
      last_name: 'Admin',
      email: 'admin@eoty.org',
      password_hash: adminPassword,
      role: 'admin', // Changed to match migrations
      chapter_id: chapters[0].id,
      is_active: true,
      email_verified: true
    }
  ];
  
  // Clear existing users and insert new ones
  await knex('users').del();
  
  for (const user of users) {
    await knex('users').insert(user);
    console.log(`Created user: ${user.email} with role: ${user.role}`);
  }
  
  console.log('✅ Users seeded');
};