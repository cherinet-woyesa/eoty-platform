const db = require('./config/database');

async function checkSchema() {
  try {
    const hasPhone = await db.schema.hasColumn('users', 'phone_number');
    const hasDob = await db.schema.hasColumn('users', 'date_of_birth');
    const hasTeacherProfiles = await db.schema.hasTable('teacher_profiles');
    
    console.log('Schema Check:');
    console.log('users.phone_number:', hasPhone);
    console.log('users.date_of_birth:', hasDob);
    console.log('table teacher_profiles:', hasTeacherProfiles);
  } catch (err) {
    console.error(err);
  } finally {
    await db.destroy();
  }
}

checkSchema();
