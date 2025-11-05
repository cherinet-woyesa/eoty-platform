// backend/test-lesson-api.js
// Test script for lesson management API endpoints

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/courses';
let authToken = '';
let testCourseId = null;
let testLessonId = null;

// Helper function to make authenticated requests
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

// Test functions
async function login() {
  console.log('\n=== Testing Login ===');
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'teacher@example.com',
      password: 'password123'
    });
    
    authToken = response.data.token;
    console.log('✓ Login successful');
    console.log('Token:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestCourse() {
  console.log('\n=== Creating Test Course ===');
  try {
    const response = await api.post('/', {
      title: 'Test Course for Lesson Management',
      description: 'Testing lesson CRUD operations',
      category: 'faith',
      level: 'beginner'
    });
    
    testCourseId = response.data.data.course.id;
    console.log('✓ Course created successfully');
    console.log('Course ID:', testCourseId);
    return true;
  } catch (error) {
    console.error('✗ Course creation failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestLesson() {
  console.log('\n=== Creating Test Lesson ===');
  try {
    const response = await api.post(`/${testCourseId}/lessons`, {
      title: 'Test Lesson 1',
      description: 'First test lesson',
      order: 1,
      duration: 10
    });
    
    testLessonId = response.data.data.lesson.id;
    console.log('✓ Lesson created successfully');
    console.log('Lesson ID:', testLessonId);
    console.log('Lesson data:', JSON.stringify(response.data.data.lesson, null, 2));
    return true;
  } catch (error) {
    console.error('✗ Lesson creation failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUpdateLesson() {
  console.log('\n=== Testing Update Lesson ===');
  try {
    const response = await api.put(`/lessons/${testLessonId}`, {
      title: 'Updated Test Lesson 1',
      description: 'Updated description',
      duration: 15
    });
    
    console.log('✓ Lesson updated successfully');
    console.log('Updated lesson:', JSON.stringify(response.data.data.lesson, null, 2));
    return true;
  } catch (error) {
    console.error('✗ Lesson update failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetVideoStatus() {
  console.log('\n=== Testing Get Video Status ===');
  try {
    const response = await api.get(`/lessons/${testLessonId}/video-status`);
    
    console.log('✓ Video status retrieved successfully');
    console.log('Video status:', JSON.stringify(response.data.data, null, 2));
    return true;
  } catch (error) {
    console.error('✗ Get video status failed:', error.response?.data || error.message);
    return false;
  }
}

async function testReorderLessons() {
  console.log('\n=== Testing Reorder Lessons ===');
  
  // Create additional lessons first
  try {
    const lesson2 = await api.post(`/${testCourseId}/lessons`, {
      title: 'Test Lesson 2',
      description: 'Second test lesson',
      order: 2,
      duration: 12
    });
    
    const lesson3 = await api.post(`/${testCourseId}/lessons`, {
      title: 'Test Lesson 3',
      description: 'Third test lesson',
      order: 3,
      duration: 8
    });
    
    console.log('✓ Additional lessons created');
    
    // Now reorder them
    const response = await api.post(`/${testCourseId}/lessons/reorder`, {
      lessons: [
        { id: lesson3.data.data.lesson.id, order: 1 },
        { id: testLessonId, order: 2 },
        { id: lesson2.data.data.lesson.id, order: 3 }
      ]
    });
    
    console.log('✓ Lessons reordered successfully');
    console.log('Reordered lessons:', JSON.stringify(response.data.data.lessons, null, 2));
    return true;
  } catch (error) {
    console.error('✗ Reorder lessons failed:', error.response?.data || error.message);
    return false;
  }
}

async function testValidation() {
  console.log('\n=== Testing Validation ===');
  
  // Test invalid title (too short)
  try {
    await api.put(`/lessons/${testLessonId}`, {
      title: 'ab'
    });
    console.log('✗ Validation should have failed for short title');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Validation correctly rejected short title');
      console.log('Error:', error.response.data.errors);
    } else {
      console.error('✗ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
  
  // Test invalid order (negative)
  try {
    await api.put(`/lessons/${testLessonId}`, {
      order: -1
    });
    console.log('✗ Validation should have failed for negative order');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✓ Validation correctly rejected negative order');
      console.log('Error:', error.response.data.errors);
    } else {
      console.error('✗ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
  
  return true;
}

async function testPermissions() {
  console.log('\n=== Testing Permissions ===');
  
  // Try to update a lesson without proper permissions
  // First, create a new user token (if available)
  console.log('Note: Permission tests require a second user account');
  console.log('Skipping permission tests for now');
  return true;
}

async function testDeleteLesson() {
  console.log('\n=== Testing Delete Lesson ===');
  try {
    const response = await api.delete(`/lessons/${testLessonId}`);
    
    console.log('✓ Lesson deleted successfully');
    console.log('Delete response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('✗ Lesson deletion failed:', error.response?.data || error.message);
    return false;
  }
}

async function cleanup() {
  console.log('\n=== Cleanup ===');
  try {
    if (testCourseId) {
      await api.delete(`/${testCourseId}`);
      console.log('✓ Test course deleted');
    }
  } catch (error) {
    console.error('✗ Cleanup failed:', error.response?.data || error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('Starting Lesson Management API Tests...');
  console.log('Make sure the backend server is running on http://localhost:5000');
  
  try {
    // Login
    if (!await login()) {
      console.log('\n❌ Tests aborted: Login failed');
      return;
    }
    
    // Create test course
    if (!await createTestCourse()) {
      console.log('\n❌ Tests aborted: Course creation failed');
      return;
    }
    
    // Create test lesson
    if (!await createTestLesson()) {
      console.log('\n❌ Tests aborted: Lesson creation failed');
      await cleanup();
      return;
    }
    
    // Run tests
    await testUpdateLesson();
    await testGetVideoStatus();
    await testReorderLessons();
    await testValidation();
    await testPermissions();
    await testDeleteLesson();
    
    // Cleanup
    await cleanup();
    
    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    await cleanup();
  }
}

// Run the tests
runTests();
