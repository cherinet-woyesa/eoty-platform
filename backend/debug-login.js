const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function debugLogin() {
  try {
    // Get the user from the database
    const user = await db('users').where({ email: 'teacher@eoty.org' }).first();
    
    if (!user) {
      console.log('User not found in database');
      return;
    }
    
    console.log('User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      password_hash: user.password_hash
    });
    
    // Test the expected password
    const expectedPassword = 'teacher123';
    console.log('Testing expected password:', expectedPassword);
    
    const isValid = await bcrypt.compare(expectedPassword, user.password_hash);
    console.log('Password validation result:', isValid);
    
    // Also test what might be happening in the login process
    console.log('\nTesting with different inputs:');
    
    // Test with extra spaces
    const withSpaces = ' ' + expectedPassword + ' ';
    console.log('With spaces:', await bcrypt.compare(withSpaces, user.password_hash));
    
    // Test with different case
    const upperCase = expectedPassword.toUpperCase();
    console.log('Upper case:', await bcrypt.compare(upperCase, user.password_hash));
    
    // Test empty password
    console.log('Empty password:', await bcrypt.compare('', user.password_hash));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.destroy();
  }
}

debugLogin();