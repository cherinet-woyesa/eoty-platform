/**
 * Simple test for engagement analytics endpoint
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function test() {
  try {
    // Login
    console.log('Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'teacher@eoty.org',
      password: 'Teacher123!'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful\n');
    
    // Get courses
    console.log('Getting courses...');
    const coursesResponse = await axios.get(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const courseId = coursesResponse.data.data.courses[0].id;
    console.log(`✅ Using course ID: ${courseId}\n`);
    
    // Test engagement analytics
    console.log('Testing engagement analytics...');
    const response = await axios.get(
      `${BASE_URL}/courses/${courseId}/analytics/engagement`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { granularity: 'daily' }
      }
    );
    
    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Full error:', error.response.data);
    }
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

test();
