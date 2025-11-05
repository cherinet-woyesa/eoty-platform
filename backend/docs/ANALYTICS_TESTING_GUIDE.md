# Analytics API Testing Guide

## Quick Start

The analytics endpoints are fully implemented and ready to use. Here's how to test them:

## Option 1: Using the Frontend (Recommended)

Once the frontend is integrated, you can test the analytics through the UI:

1. Log in as a teacher
2. Navigate to one of your courses
3. Access the analytics/dashboard section
4. View student progress, engagement metrics, and export data

## Option 2: Manual API Testing with cURL

### Step 1: Get an Authentication Token

First, log in to get a JWT token:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-teacher-email@example.com","password":"yourpassword"}'
```

Save the token from the response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Step 2: Get Your Course ID

List your courses to get a course ID:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:5000/api/courses
```

### Step 3: Test Analytics Endpoints

Replace `YOUR_TOKEN_HERE` with your actual token and `COURSE_ID` with your course ID:

#### Get Enrolled Students
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:5000/api/courses/COURSE_ID/students?page=1&pageSize=10"
```

#### Get Student Progress
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:5000/api/courses/COURSE_ID/students/STUDENT_ID/progress"
```

#### Get Engagement Analytics
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:5000/api/courses/COURSE_ID/analytics/engagement?granularity=daily"
```

#### Export as CSV
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:5000/api/courses/COURSE_ID/analytics/export?format=csv&reportType=summary" \
  -o analytics.csv
```

#### Export as JSON
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:5000/api/courses/COURSE_ID/analytics/export?format=json&reportType=students"
```

## Option 3: Using the Test Script

Update the test script with your credentials:

```bash
# Method 1: Environment variables
TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node test-analytics-api.js

# Method 2: Edit the script
# Open backend/test-analytics-api.js and update the TEST_TEACHER object
```

## Option 4: Using Postman or Thunder Client

1. Import the endpoints into your API testing tool
2. Set up authentication with your JWT token
3. Test each endpoint with different parameters

### Postman Collection Structure

```
Analytics API
├── Auth
│   └── POST Login
├── Students
│   ├── GET Enrolled Students
│   └── GET Student Progress
├── Analytics
│   ├── GET Engagement Analytics
│   └── GET Export (CSV)
└── GET Export (JSON)
```

## Verification Checklist

Test each endpoint and verify:

### ✅ GET /api/courses/:courseId/students
- [ ] Returns paginated list of students
- [ ] Search works (try searching by name)
- [ ] Sorting works (try different sortBy values)
- [ ] Includes progress metrics (lessonsAccessed, lessonsCompleted, totalTimeSpent)
- [ ] Pagination info is correct

### ✅ GET /api/courses/:courseId/students/:studentId/progress
- [ ] Returns detailed student info
- [ ] Includes lesson-by-lesson progress
- [ ] Shows quiz scores if available
- [ ] Includes engagement timeline
- [ ] Summary statistics are calculated correctly

### ✅ GET /api/courses/:courseId/analytics/engagement
- [ ] Returns time-series data
- [ ] Different granularities work (daily, weekly, monthly)
- [ ] Drop-off points are identified
- [ ] Lesson statistics are accurate
- [ ] Date range filtering works
- [ ] Second request shows cached: true

### ✅ GET /api/courses/:courseId/analytics/export
- [ ] CSV format downloads correctly
- [ ] JSON format returns proper structure
- [ ] Both report types work (summary, students)
- [ ] Data is properly formatted

## Expected Response Examples

### Enrolled Students Response
```json
{
  "success": true,
  "data": {
    "students": [
      {
        "user_id": 123,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "enrollment_status": "active",
        "progress_percentage": 45.5,
        "lessonsCompleted": 5,
        "totalTimeSpent": 3600
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalItems": 50,
      "totalPages": 5
    }
  }
}
```

### Engagement Analytics Response
```json
{
  "success": true,
  "data": {
    "courseId": 1,
    "dailyActiveStudents": [...],
    "lessonStats": [...],
    "dropOffPoints": [
      {
        "lessonId": 5,
        "title": "Advanced Concepts",
        "isDropOffPoint": true,
        "completionRate": 37.5
      }
    ],
    "enrollmentTrend": [...],
    "timeOfDayActivity": [...]
  },
  "cached": false
}
```

## Common Issues & Solutions

### Issue: "Invalid email or password"
**Solution**: Make sure you're using valid credentials from your database. Check the users table for a teacher account.

### Issue: "Course not found"
**Solution**: Verify the course ID exists and belongs to the logged-in teacher.

### Issue: "You do not have permission"
**Solution**: Ensure you're logged in as a teacher who owns the course, or as an admin.

### Issue: No students returned
**Solution**: This is normal if no students are enrolled. The endpoint will return an empty array with pagination info.

### Issue: Empty analytics data
**Solution**: This is expected if there's no student activity yet. The structure will be correct but arrays will be empty.

## Database Setup for Testing

If you need test data, you can:

1. **Create a teacher account** (if you don't have one)
2. **Create a course** as that teacher
3. **Enroll some students** in the course
4. **Add some lesson progress** data

Or use the existing seed data if available.

## Performance Testing

To test caching:

1. Make a request to the engagement endpoint
2. Note the response time
3. Make the same request again within 5 minutes
4. The second request should be faster and include `"cached": true`

## Next Steps

Once you've verified the endpoints work:

1. ✅ All endpoints return correct data structure
2. ✅ Authentication and permissions work
3. ✅ Caching improves performance
4. ✅ Export formats are correct
5. ✅ Ready for frontend integration

## Support

If you encounter issues:

1. Check the backend logs for error messages
2. Verify the database migrations ran successfully
3. Ensure the server is running on port 5000
4. Check that the analytics routes are registered in app.js
5. Review the API documentation in `backend/docs/analytics-api.md`

## Summary

The analytics API is fully functional and ready for use. The endpoints provide:

- Comprehensive student progress tracking
- Engagement analytics with drop-off detection
- Flexible querying with pagination and filtering
- Export capabilities for external analysis
- Performance optimization through caching and indexing

All endpoints are secured with proper authentication and authorization checks.
