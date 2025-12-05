const db = require('./config/database');

async function deleteUser() {
  const email = 'cherinetwoyesa55@gmail.com';
  try {
    console.log(`Attempting to delete user: ${email}`);
    const count = await db('users').where({ email }).del();
    if (count > 0) {
      console.log(`Successfully deleted user: ${email}`);
    } else {
      console.log(`User not found: ${email}`);
    }
  } catch (error) {
    console.error('Error deleting user:', error);
  } finally {
    await db.destroy();
  }
}

deleteUser();
