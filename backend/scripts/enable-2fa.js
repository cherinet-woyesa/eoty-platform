const db = require('../config/database');

const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address');
  process.exit(1);
}

async function enable2FA() {
  try {
    const user = await db('users').where({ email: email.toLowerCase() }).first();
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    await db('users')
      .where({ id: user.id })
      .update({
        is_2fa_enabled: true,
        updated_at: new Date()
      });

    console.log(`2FA enabled for user ${email}`);
    process.exit(0);
  } catch (error) {
    console.error('Error enabling 2FA:', error);
    process.exit(1);
  }
}

enable2FA();
