/**
 * Test script for course management API endpoints
 * Run with: node test-course-api.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
let authToken = '';
let testCourseId = null;

// Helper function to make authenticated requests
const api = axios.create({
  baseURL: API_BASE_URL,
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
  console.log('\n📝 Testing login...');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'teacher@example.com',
      password: 'password123'
    });
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testCreateCourse() {
  console.log('\n📝 Testing course creation...');
  try {
    const response = await api.post('/courses', {
      title: 'Test Course for API',
      description: 'This is a test course created by the API test script',
      category: 'faith',
      level: 'beginner'
    });
    
    if (response.data.success) {
      testCourseId = response.data.data.course.id;
      console.log('✅ Course created successfully');
      console.log('   Course ID:', testCourseId);
      console.log('   Title:', response.data.data.course.title);
      console.log('   Level:', response.data.data.course.level);
      return true;
    } else {
      console.log('❌ Course creation failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Course creation error:', error.response?.data?.message || error.message);
    if (error.response?.data?.error?.details) {
      console.log('   Validation errors:', error.response.data.error.details);
    }
    return false;
  }
}

async function testUpdateCourse() {
  console.log('\n📝 Testing course update...');
  if (!testCourseId) {
    console.log('⚠️  Skipping: No test course ID available');
    return false;
  }
  
  try {
    const response = await api.put(`/courses/${testCourseId}`, {
      title: 'Updated Test Course',
      description: 'This course has been updated',
      level: 'intermediate'
    });
    
    if (response.data.success) {
      console.log('✅ Course updated successfully');
      console.log('   New title:', response.data.data.course.title);
      console.log('   New level:', response.data.data.course.level);
      return true;
    } else {
      console.log('❌ Course update failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Course update error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testGetCourseAnalytics() {
  console.log('\n📝 Testing course analytics...');
  if (!testCourseId) {
    console.log('⚠️  Skipping: No test course ID available');
    return false;
  }
  
  try {
    const response = await api.get(`/courses/${testCourseId}/analytics`);
    
    if (response.data.success) {
      console.log('✅ Course analytics retrieved successfully');
      console.log('   Lesson count:', response.data.data.analytics.lessonCount);
      console.log('   Total enrollments:', response.data.data.analytics.totalEnrollments);
      console.log('   Completion rate:', response.data.data.analytics.completionRate + '%');
      return true;
    } else {
      console.log('❌ Course analytics failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Course analytics error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testBulkPublish() {
  console.log('\n📝 Testing bulk publish...');
  if (!testCourseId) {
    console.log('⚠️  Skipping: No test course ID available');
    return false;
  }
  
  try {
    const response = await api.post('/courses/bulk-action', {
      action: 'publish',
      courseIds: [testCourseId]
    });
    
    if (response.data.success) {
      console.log('✅ Bulk publish completed');
      console.log('   Success count:', response.data.data.successCount);
      console.log('   Failed count:', response.data.data.failedCount);
      if (response.data.data.failed.length > 0) {
        console.log('   Failed courses:', response.data.data.failed);
      }
      return true;
    } else {
      console.log('❌ Bulk publish failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Bulk publish error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testDeleteCourse() {
  console.log('\n📝 Testing course deletion...');
  if (!testCourseId) {
    console.log('⚠️  Skipping: No test course ID available');
    return false;
  }
  
  try {
    const response = await api.delete(`/courses/${testCourseId}`);
    
    if (response.data.success) {
      console.log('✅ Course deleted successfully');
      console.log('   Lessons deleted:', response.data.data.impact.lessonsDeleted);
      console.log('   Students affected:', response.data.data.impact.studentsAffected);
      return true;
    } else {
      console.log('❌ Course deletion failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.log('❌ Course deletion error:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testValidation() {
  console.log('\n📝 Testing validation...');
  try {
    const response = await api.post('/courses', {
      title: 'AB', // Too short
      category: 'invalid_category',
      level: 'expert' // Invalid level
    });
    
    console.log('❌ Validation should have failed but succeeded');
    return false;
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.code === 'VALIDATION_ERROR') {
      console.log('✅ Validation working correctly');
      console.log('   Validation errors:', error.response.data.error.details);
      return true;
    } else {
      console.log('❌ Unexpected error:', error.response?.data?.message || error.message);
      return false;
    }
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Course API Tests...');
  console.log('================================');
  
  const results = {
    passed: 0,
    failed: 0
  };
  
  // Login first
  if (!await login()) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Run tests
  const tests = [
    { name: 'Validation', fn: testValidation },
    { name: 'Create Course', fn: testCreateCourse },
    { name: 'Update Course', fn: testUpdateCourse },
    { name: 'Get Analytics', fn: testGetCourseAnalytics },
    { name: 'Bulk Publish', fn: testBulkPublish },
    { name: 'Delete Course', fn: testDeleteCourse }
  ];
  
  for (const test of tests) {
    const result = await test.fn();
    if (result) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  // Summary
  console.log('\n================================');
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   Total: ${results.passed + results.failed}`);
  console.log('================================\n');
}

// Run the tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
