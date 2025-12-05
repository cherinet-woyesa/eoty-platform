const db = require('./backend/config/database');

async function checkUserAndSchema() {
  try {
    // Check schema
    const hasColumn = await db.schema.hasColumn('users', 'is_2fa_enabled');
    console.log("Column 'is_2fa_enabled' exists:", hasColumn);

    // Check user
    const email = 'cherinetwoyesa55@gmail.com';
    const user = await db('users').where({ email }).first();
    if (user) {
      console.log('User found:', {
        id: user.id,
        email: user.email,
        is_2fa_enabled: user.is_2fa_enabled
      });
    } else {
      console.log('User not found:', email);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit();
  }
}

checkUserAndSchema();
