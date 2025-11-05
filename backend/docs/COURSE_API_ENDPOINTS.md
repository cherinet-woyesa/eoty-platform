# Course Management API Endpoints

## Overview
This document describes the backend API endpoints for course management, including CRUD operations, bulk actions, and analytics.

## Authentication
All endpoints require authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### 1. Get User Courses
**GET** `/api/courses`

Retrieves all courses for the authenticated user based on their role.

**Permissions Required:** `course:view`

**Response:**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": 1,
        "title": "Introduction to Faith",
        "description": "...",
        "category": "faith",
        "level": "beginner",
        "cover_image": "...",
        "is_published": true,
        "lesson_count": 10,
        "student_count": 25,
        "total_duration": 300
      }
    ]
  }
}
```

---

### 2. Create Course
**POST** `/api/courses`

Creates a new course.

**Permissions Required:** `course:create`

**Rate Limit:** 20 requests per hour

**Request Body:**
```json
{
  "title": "Course Title",
  "description": "Course description",
  "category": "faith",
  "level": "beginner"
}
```

**Validation Rules:**
- `title`: Required, 3-200 characters
- `category`: Optional, must be one of: faith, history, spiritual, bible, liturgical, youth
- `level`: Optional, must be one of: beginner, intermediate, advanced

**Response:**
```json
{
  "success": true,
  "message": "Course created successfully",
  "data": {
    "course": { ... }
  }
}
```

---

### 3. Update Course
**PUT** `/api/courses/:courseId`

Updates an existing course. Only the course owner (teacher) or admins can update.

**Permissions Required:** `course:edit`

**Request Body:**
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "category": "history",
  "level": "intermediate",
  "is_published": true,
  "cover_image": "https://..."
}
```

**Validation Rules:**
- Same as Create Course
- All fields are optional (only provided fields will be updated)

**Response:**
```json
{
  "success": true,
  "message": "Course updated successfully",
  "data": {
    "course": {
      "id": 1,
      "title": "Updated Title",
      "lesson_count": 10,
      "student_count": 25,
      "total_duration": 300,
      ...
    }
  }
}
```

---

### 4. Delete Course
**DELETE** `/api/courses/:courseId`

Deletes a course and all associated lessons (cascade delete). Only the course owner or admins can delete.

**Permissions Required:** `course:delete`

**Response:**
```json
{
  "success": true,
  "message": "Course deleted successfully",
  "data": {
    "deletedCourseId": 1,
    "impact": {
      "lessonsDeleted": 10,
      "studentsAffected": 25
    }
  }
}
```

---

### 5. Bulk Actions
**POST** `/api/courses/bulk-action`

Performs bulk operations on multiple courses.

**Permissions Required:** `course:edit`

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "action": "publish",
  "courseIds": [1, 2, 3]
}
```

**Validation Rules:**
- `action`: Required, must be one of: publish, unpublish, delete, archive, unarchive
- `courseIds`: Required array, 1-50 course IDs, all must be positive integers

**Actions:**
- `publish`: Publishes courses (requires at least one lesson per course)
- `unpublish`: Unpublishes courses
- `delete`: Deletes courses and associated lessons
- `archive`: Marks courses as archived in metadata
- `unarchive`: Removes archived flag from metadata

**Response:**
```json
{
  "success": true,
  "message": "Bulk publish completed",
  "data": {
    "action": "publish",
    "totalRequested": 3,
    "successCount": 2,
    "failedCount": 1,
    "successfulCourseIds": [1, 2],
    "failed": [
      {
        "courseId": 3,
        "reason": "Course must have at least one lesson to be published"
      }
    ]
  }
}
```

---

### 6. Get Course Analytics
**GET** `/api/courses/:courseId/analytics`

Retrieves comprehensive analytics for a course. Only the course owner or admins can view.

**Permissions Required:** `course:view`

**Response:**
```json
{
  "success": true,
  "data": {
    "courseId": 1,
    "courseTitle": "Introduction to Faith",
    "analytics": {
      "lessonCount": 10,
      "totalDuration": 300,
      "totalEnrollments": 50,
      "activeStudents": 35,
      "completedStudents": 10,
      "completionRate": "20.00",
      "averageProgress": 65.5,
      "recentActivityCount": 120,
      "lessonStats": [
        {
          "lessonId": 1,
          "title": "Lesson 1",
          "order": 1,
          "views": 45,
          "completions": 30,
          "completionRate": "66.67"
        }
      ]
    }
  }
}
```

**Analytics Metrics:**
- `lessonCount`: Total number of lessons in the course
- `totalDuration`: Sum of all lesson durations (minutes)
- `totalEnrollments`: Total students enrolled
- `activeStudents`: Students with active enrollment status
- `completedStudents`: Students who completed the course
- `completionRate`: Percentage of students who completed (%)
- `averageProgress`: Average progress across all enrolled students (%)
- `recentActivityCount`: Number of lesson views in last 30 days
- `lessonStats`: Per-lesson statistics with views and completion rates

---

## Error Responses

### Validation Error (400)
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

### Unauthorized (401)
```json
{
  "success": false,
  "message": "Access token required"
}
```

### Forbidden (403)
```json
{
  "success": false,
  "message": "You do not have permission to modify this course"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Course not found"
}
```

### Rate Limit (429)
```json
{
  "success": false,
  "message": "Too many courses created from this IP, please try again later"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Failed to update course"
}
```

---

## Permission Checks

All endpoints implement permission checks:
1. **Teacher**: Can only modify/delete/view analytics for courses they created
2. **Chapter Admin**: Can modify/delete/view any course in their chapter
3. **Platform Admin**: Can modify/delete/view any course

---

## Rate Limiting

- **Course Creation**: 20 requests per hour per IP
- **Bulk Operations**: 5 requests per 15 minutes per IP
- **Video Uploads**: 10 requests per 15 minutes per IP (existing)

---

## Database Schema

### Courses Table
```sql
- id: integer (primary key)
- title: string (required)
- description: text
- category: string
- level: string (beginner/intermediate/advanced)
- cover_image: string
- chapter_id: integer (foreign key)
- created_by: integer (foreign key to users)
- is_published: boolean (default: false)
- published_at: timestamp
- metadata: jsonb
- created_at: timestamp
- updated_at: timestamp
```

### Cascade Behavior
- Deleting a course will cascade delete all associated lessons
- Deleting a course will cascade delete all lesson progress records
- Deleting a course will cascade delete all enrollments
