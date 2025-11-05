# Course Management API Documentation

This document describes the course management API endpoints implemented for the teacher UI/UX improvements.

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Update Course

**Endpoint:** `PUT /api/courses/:courseId`

**Description:** Update course details including title, description, category, level, and publishing status.

**Permissions Required:** `course:edit`

**Authorization:** Teacher must own the course OR be an admin

**Request Body:**
```json
{
  "title": "Updated Course Title",
  "description": "Updated course description",
  "category": "faith",
  "level": "intermediate",
  "cover_image": "https://example.com/image.jpg",
  "is_published": true
}
```

**Validation Rules:**
- `title`: 3-200 characters (optional in update)
- `category`: One of: faith, history, spiritual, bible, liturgical, youth
- `level`: One of: beginner, intermediate, advanced

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "course": {
      "id": 1,
      "title": "Updated Course Title",
      "description": "Updated course description",
      "category": "faith",
      "level": "intermediate",
      "cover_image": "https://example.com/image.jpg",
      "is_published": true,
      "published_at": "2024-11-04T10:30:00.000Z",
      "created_by": 5,
      "created_at": "2024-11-01T08:00:00.000Z",
      "updated_at": "2024-11-04T10:30:00.000Z",
      "lesson_count": 5,
      "student_count": 12,
      "total_duration": 120
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `403 Forbidden`: User doesn't have permission to modify this course
- `404 Not Found`: Course not found

---

### 2. Delete Course

**Endpoint:** `DELETE /api/courses/:courseId`

**Description:** Delete a course and all associated lessons (cascade deletion).

**Permissions Required:** `course:delete`

**Authorization:** Teacher must own the course OR be an admin

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Course deleted successfully",
  "data": {
    "deletedCourseId": 1,
    "impact": {
      "lessonsDeleted": 5,
      "studentsAffected": 12
    }
  }
}
```

**Error Responses:**
- `403 Forbidden`: User doesn't have permission to delete this course
- `404 Not Found`: Course not found

---

### 3. Bulk Actions

**Endpoint:** `POST /api/courses/bulk-action`

**Description:** Perform bulk operations on multiple courses.

**Permissions Required:** `course:edit`

**Authorization:** Teacher must own all courses OR be an admin

**Rate Limiting:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "action": "publish",
  "courseIds": [1, 2, 3, 4, 5]
}
```

**Supported Actions:**
- `publish`: Publish courses (validates each course has at least one lesson)
- `unpublish`: Unpublish courses
- `delete`: Delete courses
- `archive`: Mark courses as archived
- `unarchive`: Remove archived flag

**Validation Rules:**
- `action`: Required, must be one of the supported actions
- `courseIds`: Required array, 1-50 course IDs, all must be positive integers

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Bulk publish completed",
  "data": {
    "action": "publish",
    "totalRequested": 5,
    "successCount": 4,
    "failedCount": 1,
    "successfulCourseIds": [1, 2, 3, 4],
    "failed": [
      {
        "courseId": 5,
        "reason": "Course must have at least one lesson to be published"
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `403 Forbidden`: User doesn't have permission to modify some courses
- `404 Not Found`: No courses found with provided IDs

---

### 4. Get Course Analytics

**Endpoint:** `GET /api/courses/:courseId/analytics`

**Description:** Get comprehensive analytics for a course including enrollment, completion, and lesson statistics.

**Permissions Required:** `course:view`

**Authorization:** Teacher must own the course OR be an admin

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "courseId": 1,
    "courseTitle": "Introduction to Faith",
    "analytics": {
      "lessonCount": 10,
      "totalDuration": 240,
      "totalEnrollments": 50,
      "activeStudents": 35,
      "completedStudents": 15,
      "completionRate": "30.00",
      "averageProgress": 65.5,
      "recentActivityCount": 120,
      "lessonStats": [
        {
          "lessonId": 1,
          "title": "Introduction",
          "order": 1,
          "views": 50,
          "completions": 45,
          "completionRate": "90.00"
        },
        {
          "lessonId": 2,
          "title": "Core Concepts",
          "order": 2,
          "views": 45,
          "completions": 40,
          "completionRate": "88.89"
        }
      ]
    }
  }
}
```

**Analytics Fields:**
- `lessonCount`: Total number of lessons in the course
- `totalDuration`: Total duration of all lessons in minutes
- `totalEnrollments`: Total number of students enrolled
- `activeStudents`: Students with active enrollment status
- `completedStudents`: Students who completed the course
- `completionRate`: Percentage of students who completed (as string)
- `averageProgress`: Average progress across all enrolled students (0-100)
- `recentActivityCount`: Number of lesson views in the last 30 days
- `lessonStats`: Array of per-lesson statistics

**Error Responses:**
- `403 Forbidden`: User doesn't have permission to view analytics for this course
- `404 Not Found`: Course not found

---

## Rate Limiting

The following rate limits are applied:

- **Course Creation:** 20 requests per hour per IP
- **Bulk Operations:** 5 requests per 15 minutes per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1699099200
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid course data",
    "details": {
      "title": "Title must be at least 3 characters",
      "category": "Category must be one of: faith, history, spiritual, bible, liturgical, youth"
    }
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Request data validation failed
- `AUTHENTICATION_ERROR`: Missing or invalid authentication token
- `AUTHORIZATION_ERROR`: User doesn't have required permissions
- `NOT_FOUND`: Requested resource not found
- `RATE_LIMIT_ERROR`: Rate limit exceeded

---

## Database Schema Changes

### New Columns Added to `courses` Table:

```sql
ALTER TABLE courses ADD COLUMN level VARCHAR(255);
ALTER TABLE courses ADD COLUMN cover_image VARCHAR(255);
```

**Migration File:** `017_add_course_level_and_cover_image.js`

---

## Permissions

### New Permission Added:

The `course:delete` permission has been added to the teacher role.

**Migration:** Updated in `003_permissions_system.js`
**Seed:** Updated in `003_permissions.js`

---

## Testing

A test script is provided to verify all endpoints:

```bash
node test-course-api.js
```

The test script will:
1. Authenticate as a teacher
2. Test validation
3. Create a test course
4. Update the course
5. Get course analytics
6. Perform bulk publish
7. Delete the course

---

## Examples

### Example 1: Update Course Level

```bash
curl -X PUT http://localhost:5000/api/courses/1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "level": "advanced"
  }'
```

### Example 2: Bulk Publish Courses

```bash
curl -X POST http://localhost:5000/api/courses/bulk-action \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "publish",
    "courseIds": [1, 2, 3]
  }'
```

### Example 3: Get Course Analytics

```bash
curl -X GET http://localhost:5000/api/courses/1/analytics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Notes

1. **Cascade Deletion:** When a course is deleted, all associated lessons are automatically deleted due to foreign key constraints.

2. **Publishing Validation:** Courses can only be published if they have at least one lesson. This validation is enforced in the bulk publish action.

3. **Permission Checks:** All endpoints verify that the user either owns the course or has admin privileges before allowing modifications.

4. **Statistics:** Course responses include computed statistics (lesson_count, student_count, total_duration) for convenience.

5. **Archived Courses:** The archive/unarchive actions use the `metadata` JSONB column to store the archived flag.
