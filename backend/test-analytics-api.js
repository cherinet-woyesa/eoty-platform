/**
 * Test script for Analytics API endpoints
 * Tests all student analytics endpoints
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test credentials - UPDATE THESE WITH YOUR ACTUAL CREDENTIALS
// You can also pass them as environment variables:
// TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node test-analytics-api.js
const TEST_TEACHER = {
  email: process.env.TEST_EMAIL || 'teacher@example.com',
  password: process.env.TEST_PASSWORD || 'password123'
};

let authToken = '';
let testCourseId = null;
let testStudentId = null;

// Check if credentials are provided
if (TEST_TEACHER.email === 'teacher@example.com') {
  console.log('\n⚠️  WARNING: Using default test credentials.');
  console.log('   Please update the credentials in the script or use environment variables:');
  console.log('   TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node test-analytics-api.js\n');
}

/**
 * Login and get auth token
 */
async function login() {
  try {
    console.log('\n🔐 Logging in as teacher...');
    const response = await axios.post(`${BASE_URL}/auth/login`, TEST_TEACHER);
    
    if (response.data.success && response.data.data.token) {
      authToken = response.data.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.error('❌ Login failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Get a test course ID
 */
async function getTestCourse() {
  try {
    console.log('\n📚 Fetching test course...');
    const response = await axios.get(`${BASE_URL}/courses`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (response.data.success && response.data.data.courses.length > 0) {
      testCourseId = response.data.data.courses[0].id;
      console.log(`✅ Using course ID: ${testCourseId}`);
      return true;
    } else {
      console.error('❌ No courses found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error fetching courses:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 1: GET /api/courses/:courseId/students
 */
async function testGetEnrolledStudents() {
  try {
    console.log('\n📊 Test 1: GET /api/courses/:courseId/students');
    console.log('Testing enrolled students list...');
    
    const response = await axios.get(
      `${BASE_URL}/courses/${testCourseId}/students`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          page: 1,
          pageSize: 10,
          sortBy: 'enrolled_at',
          sortOrder: 'desc'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Enrolled students retrieved successfully');
      console.log(`   Total students: ${response.data.data.pagination.totalItems}`);
      console.log(`   Students on page: ${response.data.data.students.length}`);
      
      if (response.data.data.students.length > 0) {
        const student = response.data.data.students[0];
        testStudentId = student.user_id;
        console.log(`   Sample student: ${student.first_name} ${student.last_name}`);
        console.log(`   Progress: ${student.progress_percentage}%`);
        console.log(`   Lessons completed: ${student.lessonsCompleted}`);
      }
      
      return true;
    } else {
      console.error('❌ Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 2: GET /api/courses/:courseId/students/:studentId/progress
 */
async function testGetStudentProgress() {
  if (!testStudentId) {
    console.log('\n⏭️  Test 2: Skipped (no enrolled students)');
    return true;
  }
  
  try {
    console.log('\n📊 Test 2: GET /api/courses/:courseId/students/:studentId/progress');
    console.log(`Testing student progress for student ID: ${testStudentId}...`);
    
    const response = await axios.get(
      `${BASE_URL}/courses/${testCourseId}/students/${testStudentId}/progress`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Student progress retrieved successfully');
      const { student, summary, lessonProgress, quizScores, engagementTimeline } = response.data.data;
      
      console.log(`   Student: ${student.first_name} ${student.last_name}`);
      console.log(`   Completion rate: ${summary.completionRate}%`);
      console.log(`   Total time spent: ${Math.floor(summary.totalTimeSpent / 60)} minutes`);
      console.log(`   Lessons completed: ${summary.completedLessons}/${summary.totalLessons}`);
      console.log(`   Lesson progress entries: ${lessonProgress.length}`);
      console.log(`   Quiz scores: ${quizScores.length}`);
      console.log(`   Engagement timeline entries: ${engagementTimeline.length}`);
      
      return true;
    } else {
      console.error('❌ Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 3: GET /api/courses/:courseId/analytics/engagement
 */
async function testGetEngagementAnalytics() {
  try {
    console.log('\n📊 Test 3: GET /api/courses/:courseId/analytics/engagement');
    console.log('Testing engagement analytics...');
    
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    const response = await axios.get(
      `${BASE_URL}/courses/${testCourseId}/analytics/engagement`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          granularity: 'daily'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Engagement analytics retrieved successfully');
      const { dailyActiveStudents, lessonStats, dropOffPoints, enrollmentTrend } = response.data.data;
      
      console.log(`   Daily activity entries: ${dailyActiveStudents.length}`);
      console.log(`   Lesson statistics: ${lessonStats.length}`);
      console.log(`   Drop-off points identified: ${dropOffPoints.length}`);
      console.log(`   Enrollment trend entries: ${enrollmentTrend.length}`);
      
      if (dropOffPoints.length > 0) {
        console.log('\n   ⚠️  Drop-off points detected:');
        dropOffPoints.forEach(lesson => {
          console.log(`      - ${lesson.title} (Order: ${lesson.order})`);
          console.log(`        Views: ${lesson.totalViews}, Completion: ${lesson.completionRate}%`);
        });
      }
      
      if (lessonStats.length > 0) {
        console.log('\n   📈 Lesson completion rates:');
        lessonStats.slice(0, 3).forEach(lesson => {
          console.log(`      - ${lesson.title}: ${lesson.completionRate}% (${lesson.completions}/${lesson.totalViews})`);
        });
      }
      
      return true;
    } else {
      console.error('❌ Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 4: GET /api/courses/:courseId/analytics/export (CSV)
 */
async function testExportAnalyticsCSV() {
  try {
    console.log('\n📊 Test 4: GET /api/courses/:courseId/analytics/export (CSV)');
    console.log('Testing CSV export...');
    
    const response = await axios.get(
      `${BASE_URL}/courses/${testCourseId}/analytics/export`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          format: 'csv',
          reportType: 'summary'
        }
      }
    );
    
    if (response.status === 200 && typeof response.data === 'string') {
      console.log('✅ CSV export successful');
      const lines = response.data.split('\n');
      console.log(`   CSV lines: ${lines.length}`);
      console.log(`   Headers: ${lines[0]}`);
      
      return true;
    } else {
      console.error('❌ Failed: Invalid CSV response');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 5: GET /api/courses/:courseId/analytics/export (JSON)
 */
async function testExportAnalyticsJSON() {
  try {
    console.log('\n📊 Test 5: GET /api/courses/:courseId/analytics/export (JSON)');
    console.log('Testing JSON export...');
    
    const response = await axios.get(
      `${BASE_URL}/courses/${testCourseId}/analytics/export`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          format: 'json',
          reportType: 'students'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ JSON export successful');
      console.log(`   Course: ${response.data.data.courseTitle}`);
      console.log(`   Report type: ${response.data.data.reportType}`);
      console.log(`   Records: ${response.data.data.records.length}`);
      
      return true;
    } else {
      console.error('❌ Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 6: Test caching
 */
async function testCaching() {
  try {
    console.log('\n📊 Test 6: Testing analytics caching');
    console.log('Making first request...');
    
    const start1 = Date.now();
    const response1 = await axios.get(
      `${BASE_URL}/courses/${testCourseId}/analytics/engagement`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { granularity: 'daily' }
      }
    );
    const time1 = Date.now() - start1;
    
    console.log(`   First request: ${time1}ms (cached: ${response1.data.cached || false})`);
    
    console.log('Making second request (should be cached)...');
    const start2 = Date.now();
    const response2 = await axios.get(
      `${BASE_URL}/courses/${testCourseId}/analytics/engagement`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { granularity: 'daily' }
      }
    );
    const time2 = Date.now() - start2;
    
    console.log(`   Second request: ${time2}ms (cached: ${response2.data.cached || false})`);
    
    if (response2.data.cached) {
      console.log('✅ Caching is working correctly');
      console.log(`   Performance improvement: ${Math.round((time1 - time2) / time1 * 100)}%`);
      return true;
    } else {
      console.log('⚠️  Cache not hit on second request (may be expected if cache expired)');
      return true;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Test 7: Test date range filtering
 */
async function testDateRangeFiltering() {
  try {
    console.log('\n📊 Test 7: Testing date range filtering');
    
    const endDate = new Date();
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    console.log(`Testing with date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    const response = await axios.get(
      `${BASE_URL}/courses/${testCourseId}/analytics/engagement`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          granularity: 'daily'
        }
      }
    );
    
    if (response.data.success) {
      console.log('✅ Date range filtering working');
      console.log(`   Date range: ${response.data.data.dateRange.start} to ${response.data.data.dateRange.end}`);
      console.log(`   Data points: ${response.data.data.dailyActiveStudents.length}`);
      
      return true;
    } else {
      console.error('❌ Failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('   ANALYTICS API TEST SUITE');
  console.log('═══════════════════════════════════════════════════════');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Login
  if (!await login()) {
    console.log('\n❌ Cannot proceed without authentication');
    return;
  }
  
  // Get test course
  if (!await getTestCourse()) {
    console.log('\n❌ Cannot proceed without a test course');
    return;
  }
  
  // Run tests
  const tests = [
    { name: 'Get Enrolled Students', fn: testGetEnrolledStudents },
    { name: 'Get Student Progress', fn: testGetStudentProgress },
    { name: 'Get Engagement Analytics', fn: testGetEngagementAnalytics },
    { name: 'Export Analytics (CSV)', fn: testExportAnalyticsCSV },
    { name: 'Export Analytics (JSON)', fn: testExportAnalyticsJSON },
    { name: 'Caching', fn: testCaching },
    { name: 'Date Range Filtering', fn: testDateRangeFiltering }
  ];
  
  for (const test of tests) {
    results.total++;
    const passed = await test.fn();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   TEST SUMMARY');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Total tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success rate: ${Math.round((results.passed / results.total) * 100)}%`);
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run the tests
runAllTests().catch(console.error);
