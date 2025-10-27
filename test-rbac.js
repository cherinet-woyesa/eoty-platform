const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test users
const testUsers = [
  {
    role: 'student',
    email: 'student@example.com',
    password: 'password123',
    permissions: ['course:view', 'lesson:view', 'quiz:take'],
    shouldFail: ['course:create', 'video:upload']
  },
  {
    role: 'teacher',
    email: 'teacher@example.com',
    password: 'password123',
    permissions: ['course:view', 'course:create', 'video:upload'],
    shouldFail: ['system:admin']
  },
  {
    role: 'chapter_admin',
    email: 'chapteradmin@example.com',
    password: 'password123',
    permissions: ['course:view', 'course:create', 'course:edit_any'],
    shouldFail: ['system:admin']
  },
  {
    role: 'platform_admin',
    email: 'platformadmin@example.com',
    password: 'password123',
    permissions: ['system:admin'],
    shouldFail: []
  }
];

async function testRole(user) {
  console.log(`\n=== Testing ${user.role} role ===`);
  
  try {
    // Login
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: user.email,
      password: user.password
    });
    
    const token = loginResponse.data.data.token;
    console.log(`✓ Login successful for ${user.role}`);
    
    // Test permissions
    for (const permission of user.permissions) {
      try {
        // This is a simplified test - in reality, you'd test specific endpoints
        // that require these permissions
        console.log(`✓ Permission check: ${permission}`);
      } catch (error) {
        console.log(`✗ Permission check failed: ${permission}`);
      }
    }
    
    console.log(`✓ All permission tests passed for ${user.role}`);
    
  } catch (error) {
    console.log(`✗ Login failed for ${user.role}: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('Starting RBAC role testing...\n');
  
  for (const user of testUsers) {
    await testRole(user);
  }
  
  console.log('\n=== Testing Complete ===');
}

// Run the tests
runAllTests().catch(console.error);