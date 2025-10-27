const bcrypt = require('bcryptjs');

// Password hashes from the database
const userPasswords = {
  'cherinet@gmail.com': '$2a$12$.RcVYkzkUAlmQQMDZgaFXOrlnHUBAYsNwtBve13Dg7Td3l4/Wxt1S',
  'student@eoty.org': '$2a$12$fVYEANWFMFKb.nd0CS5DBewDzYS2XkDkOw1o7vI3ErPe9v0VNn44O',
  'teacher@eoty.org': '$2a$12$CSbCoZU2UoJ2.xl0uU1VHeibOKaTnLhi6YkvMiSI4TFxZSr7w2lq.',
  'chapter-admin@eoty.org': '$2a$12$STQ2tdJvJgxdP1TkEuedDuS2q6UJilXPl/U16yBXLscjf/Wqg1X2q',
  'admin@eoty.org': '$2a$12$Imr0alKBOWN49v1FZMEhyOLB2KjXgawCQ.xQ0KK7SL2KO1CknmnOi'
};

// Expected passwords from seed file
const expectedPasswords = {
  'student@eoty.org': 'student123',
  'teacher@eoty.org': 'teacher123',
  'chapter-admin@eoty.org': 'chapter123',
  'admin@eoty.org': 'admin123'
};

async function testPasswords() {
  console.log('Testing password validation...\n');
  
  for (const [email, expectedPassword] of Object.entries(expectedPasswords)) {
    const hash = userPasswords[email];
    if (hash) {
      const isValid = await bcrypt.compare(expectedPassword, hash);
      console.log(`${email}: ${isValid ? 'VALID' : 'INVALID'} (expected: ${expectedPassword})`);
    } else {
      console.log(`${email}: NOT FOUND IN DATABASE`);
    }
  }
  
  // Test some wrong passwords
  console.log('\nTesting wrong passwords...');
  const wrongPasswords = {
    'teacher@eoty.org': 'wrongpassword',
    'admin@eoty.org': 'wrongpassword'
  };
  
  for (const [email, wrongPassword] of Object.entries(wrongPasswords)) {
    const hash = userPasswords[email];
    if (hash) {
      const isValid = await bcrypt.compare(wrongPassword, hash);
      console.log(`${email}: ${isValid ? 'VALID' : 'INVALID'} (tested: ${wrongPassword})`);
    }
  }
}

testPasswords();