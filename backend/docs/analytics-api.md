# Student Analytics API Documentation

## Overview

The Student Analytics API provides comprehensive endpoints for tracking and analyzing student engagement, progress, and performance within courses. These endpoints are designed for teachers and administrators to gain insights into course effectiveness and student learning patterns.

## Base URL

```
/api/courses/:courseId
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Permissions

- **Teachers**: Can view analytics for courses they created
- **Chapter Admins**: Can view analytics for all courses in their chapter
- **Platform Admins**: Can view analytics for all courses

---

## Endpoints

### 1. Get Enrolled Students

Retrieve a paginated list of students enrolled in a course with their progress information.

**Endpoint:** `GET /api/courses/:courseId/students`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number for pagination |
| pageSize | integer | 20 | Number of students per page |
| search | string | "" | Search by student name or email |
| sortBy | string | "enrolled_at" | Sort field (enrolled_at, progress_percentage, last_accessed_at, first_name) |
| sortOrder | string | "desc" | Sort order (asc, desc) |

**Response:**

```json
{
  "success": true,
  "data": {
    "students": [
      {
        "user_id": 123,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "profile_picture": "https://...",
        "enrollment_status": "active",
        "enrolled_at": "2024-01-15T10:30:00Z",
        "completed_at": null,
        "progress_percentage": 45.5,
        "last_accessed_at": "2024-11-05T14:20:00Z",
        "lessonsAccessed": 8,
        "lessonsCompleted": 5,
        "totalTimeSpent": 3600
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalItems": 150,
      "totalPages": 8
    }
  }
}
```

**Use Cases:**
- Display student roster with progress overview
- Filter and search for specific students
- Sort students by engagement or progress
- Identify at-risk students (low progress or inactive)

---

### 2. Get Student Progress

Retrieve detailed progress information for a specific student in a course.

**Endpoint:** `GET /api/courses/:courseId/students/:studentId/progress`

**Response:**

```json
{
  "success": true,
  "data": {
    "student": {
      "user_id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "profile_picture": "https://...",
      "enrollment_status": "active",
      "enrolled_at": "2024-01-15T10:30:00Z",
      "completed_at": null,
      "progress_percentage": 45.5,
      "last_accessed_at": "2024-11-05T14:20:00Z"
    },
    "summary": {
      "totalLessons": 12,
      "completedLessons": 5,
      "completionRate": "41.67",
      "totalTimeSpent": 3600,
      "averageProgress": "45.50"
    },
    "lessonProgress": [
      {
        "lesson_id": 1,
        "title": "Introduction to JavaScript",
        "order": 1,
        "duration": 600,
        "progress": 1.0,
        "is_completed": true,
        "completed_at": "2024-01-16T15:30:00Z",
        "last_accessed_at": "2024-01-16T15:30:00Z",
        "time_spent": 720,
        "view_count": 2,
        "last_watched_timestamp": 600
      }
    ],
    "quizScores": [
      {
        "lesson_id": 1,
        "quiz_id": 10,
        "quiz_title": "JavaScript Basics Quiz",
        "score_percentage": 85.5,
        "is_completed": true,
        "started_at": "2024-01-16T16:00:00Z",
        "completed_at": "2024-01-16T16:15:00Z",
        "attempt_number": 1
      }
    ],
    "engagementTimeline": [
      {
        "date": "2024-11-05",
        "lessons_accessed": 3,
        "time_spent": 1800
      }
    ]
  }
}
```

**Use Cases:**
- View detailed student performance
- Identify struggling students on specific lessons
- Track student engagement over time
- Monitor quiz performance
- Provide personalized feedback

---

### 3. Get Engagement Analytics

Retrieve time-series engagement data and analytics for a course.

**Endpoint:** `GET /api/courses/:courseId/analytics/engagement`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| startDate | ISO 8601 | 30 days ago | Start date for analytics range |
| endDate | ISO 8601 | now | End date for analytics range |
| granularity | string | "daily" | Time granularity (hourly, daily, weekly, monthly) |

**Response:**

```json
{
  "success": true,
  "data": {
    "courseId": 1,
    "dateRange": {
      "start": "2024-10-06T00:00:00Z",
      "end": "2024-11-05T23:59:59Z",
      "granularity": "daily"
    },
    "dailyActiveStudents": [
      {
        "date": "2024-11-05",
        "active_students": 45,
        "lessons_accessed": 120,
        "total_time_spent": 18000,
        "lessons_completed": 35
      }
    ],
    "lessonStats": [
      {
        "lessonId": 1,
        "title": "Introduction to JavaScript",
        "order": 1,
        "totalViews": 150,
        "completions": 120,
        "completionRate": 80.0,
        "averageProgress": 0.85,
        "averageTimeSpent": 720,
        "isDropOffPoint": false
      }
    ],
    "dropOffPoints": [
      {
        "lessonId": 5,
        "title": "Advanced Concepts",
        "order": 5,
        "totalViews": 80,
        "completions": 30,
        "completionRate": 37.5,
        "isDropOffPoint": true
      }
    ],
    "enrollmentTrend": [
      {
        "date": "2024-11-05",
        "new_enrollments": 5
      }
    ],
    "timeOfDayActivity": [
      {
        "hour": 14,
        "day_of_week": 1,
        "activity_count": 45
      }
    ],
    "watchTimeByLesson": [
      {
        "lesson_id": 1,
        "title": "Introduction",
        "lesson_duration": 600,
        "average_watch_time": 720,
        "unique_viewers": 150
      }
    ]
  },
  "cached": false
}
```

**Use Cases:**
- Visualize course engagement trends
- Identify drop-off points in course content
- Analyze peak activity times
- Track enrollment growth
- Compare lesson effectiveness
- Optimize course structure based on data

**Drop-off Point Detection:**
A lesson is marked as a drop-off point if:
- Views drop by more than 30% compared to the previous lesson
- This indicates students are stopping at this point in the course

---

### 4. Export Analytics

Export analytics data in CSV or JSON format for external analysis or reporting.

**Endpoint:** `GET /api/courses/:courseId/analytics/export`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| format | string | "csv" | Export format (csv, json) |
| reportType | string | "summary" | Report type (summary, students) |

**Response (CSV format):**

```
Content-Type: text/csv
Content-Disposition: attachment; filename="Course_Title_analytics_1699200000000.csv"

lesson_title,lesson_order,total_views,completions,average_progress_percentage,average_time_spent_seconds
Introduction to JavaScript,1,150,120,85.5,720
Variables and Data Types,2,145,115,82.3,680
...
```

**Response (JSON format):**

```json
{
  "success": true,
  "data": {
    "courseTitle": "JavaScript Fundamentals",
    "courseId": 1,
    "reportType": "students",
    "generatedAt": "2024-11-05T15:30:00Z",
    "records": [
      {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "enrollment_status": "active",
        "enrolled_at": "2024-01-15T10:30:00Z",
        "progress_percentage": 45.5,
        "last_accessed_at": "2024-11-05T14:20:00Z",
        "lessons_accessed": 8,
        "lessons_completed": 5,
        "total_time_spent": 3600
      }
    ]
  }
}
```

**Report Types:**

1. **summary**: Lesson-by-lesson analytics
   - Lesson title and order
   - Total views and completions
   - Average progress and time spent

2. **students**: Student roster with progress
   - Student information
   - Enrollment details
   - Progress metrics
   - Time spent

**Use Cases:**
- Generate reports for stakeholders
- Import data into spreadsheet tools
- Create custom visualizations
- Archive historical data
- Compliance and record-keeping

---

## Caching

The engagement analytics endpoint implements caching to improve performance:

- **Cache Duration**: 5 minutes
- **Cache Key**: Based on courseId, date range, and granularity
- **Cache Indicator**: Response includes `cached: true` when served from cache

**Benefits:**
- Reduced database load
- Faster response times for repeated queries
- Better scalability for high-traffic courses

**Cache Invalidation:**
- Automatic expiration after 5 minutes
- Manual clearing not currently supported (future enhancement)

---

## Performance Optimizations

### Database Indexes

The following indexes are created to optimize analytics queries:

**user_lesson_progress:**
- `idx_ulp_last_accessed`: For date range filtering
- `idx_ulp_completion`: For completion tracking
- `idx_ulp_time_spent`: For time aggregations

**user_course_enrollments:**
- `idx_uce_enrollment_trend`: For enrollment trends
- `idx_uce_active_students`: For active student filtering
- `idx_uce_completion`: For completion tracking

**quiz_sessions:**
- `idx_qs_user_timeline`: For user activity timeline
- `idx_qs_completion_scores`: For quiz performance

**user_engagement:**
- `idx_ue_content_timeline`: For content engagement timeline
- `idx_ue_user_activity`: For user activity tracking

### Query Optimization

- Efficient aggregations using database-level GROUP BY
- Selective column retrieval
- Proper use of JOINs and LEFT JOINs
- Pagination for large result sets

---

## Error Responses

### 404 Not Found

```json
{
  "success": false,
  "message": "Course not found"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "You do not have permission to view analytics for this course"
}
```

### 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid format. Supported formats: csv, json"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to fetch engagement analytics"
}
```

---

## Example Usage

### JavaScript/Axios

```javascript
// Get enrolled students with search and pagination
const response = await axios.get(
  `/api/courses/${courseId}/students`,
  {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      page: 1,
      pageSize: 20,
      search: 'john',
      sortBy: 'progress_percentage',
      sortOrder: 'asc'
    }
  }
);

// Get engagement analytics for last 7 days
const endDate = new Date();
const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

const analytics = await axios.get(
  `/api/courses/${courseId}/analytics/engagement`,
  {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      granularity: 'daily'
    }
  }
);

// Export student data as CSV
const csvExport = await axios.get(
  `/api/courses/${courseId}/analytics/export`,
  {
    headers: { Authorization: `Bearer ${token}` },
    params: {
      format: 'csv',
      reportType: 'students'
    }
  }
);
```

---

## Testing

A comprehensive test suite is available at `backend/test-analytics-api.js`.

**Run tests:**

```bash
cd backend
node test-analytics-api.js
```

**Test coverage:**
- Authentication
- Enrolled students list with pagination
- Individual student progress
- Engagement analytics with date ranges
- CSV export
- JSON export
- Caching functionality
- Date range filtering

---

## Future Enhancements

1. **Real-time Analytics**: WebSocket support for live updates
2. **Predictive Analytics**: ML-based predictions for student success
3. **Comparative Analytics**: Compare courses or cohorts
4. **Custom Reports**: User-defined report templates
5. **Redis Caching**: Distributed caching for production
6. **Rate Limiting**: Prevent abuse of analytics endpoints
7. **Data Aggregation**: Pre-computed daily/weekly summaries
8. **Export Formats**: PDF, Excel support
9. **Scheduled Reports**: Email reports on schedule
10. **API Webhooks**: Notify external systems of key events

---

## Support

For issues or questions about the Analytics API:
- Check the test suite for usage examples
- Review error messages for troubleshooting
- Ensure proper authentication and permissions
- Verify database indexes are created

