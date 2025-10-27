const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login API...');
    
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'teacher@eoty.org',
      password: 'teacher123'
    });
    
    console.log('Login response:', response.data);
  } catch (error) {
    console.log('Login error:', error.response?.data || error.message);
  }
}

testLogin();