# Lesson Management API Documentation

This document describes the lesson management API endpoints implemented for the teacher UI/UX improvements.

## Overview

The lesson management API provides comprehensive CRUD operations for lessons, including:
- Updating lesson details
- Deleting lessons with video cleanup
- Reordering lessons with drag-and-drop support
- Checking video processing status
- Automatic course statistics updates

## Authentication

All endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Permissions

The following permissions are required:
- `lesson:edit` - Update and reorder lessons
- `lesson:delete` - Delete lessons
- `lesson:view` - View lesson details and video status

## Endpoints

### 1. Update Lesson

Update lesson details including title, description, order, duration, and publishing status.

**Endpoint:** `PUT /api/courses/lessons/:lessonId`

**Permissions:** `lesson:edit`

**Request Body:**
```json
{
  "title": "Updated Lesson Title",
  "description": "Updated lesson description",
  "order": 2,
  "duration": 15,
  "video_url": "https://example.com/video.mp4",
  "is_published": true
}
```

**Validation Rules:**
- `title`: 3-200 characters (optional)
- `description`: Max 5000 characters (optional)
- `order`: Non-negative integer (optional)
- `duration`: Non-negative integer in minutes (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lesson updated successfully",
  "data": {
    "lesson": {
      "id": 123,
      "title": "Updated Lesson Title",
      "description": "Updated lesson description",
      "course_id": 45,
      "order": 2,
      "duration": 15,
      "video_url": "https://example.com/video.mp4",
      "is_published": true,
      "published_at": "2025-11-05T10:30:00.000Z",
      "created_at": "2025-11-01T08:00:00.000Z",
      "updated_at": "2025-11-05T10:30:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed
- `403 Forbidden` - User doesn't own the course
- `404 Not Found` - Lesson not found

---

### 2. Delete Lesson

Delete a lesson and clean up associated video files from cloud storage.

**Endpoint:** `DELETE /api/courses/lessons/:lessonId`

**Permissions:** `lesson:delete`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lesson deleted successfully",
  "data": {
    "deletedLessonId": 123,
    "courseId": 45
  }
}
```

**Notes:**
- Automatically deletes video from cloud storage if exists
- Updates course statistics (lesson_count, total_duration)
- Cascade deletes related records (progress, quizzes, etc.)

**Error Responses:**
- `403 Forbidden` - User doesn't own the course
- `404 Not Found` - Lesson not found

---

### 3. Reorder Lessons

Reorder lessons within a course with automatic numbering.

**Endpoint:** `POST /api/courses/:courseId/lessons/reorder`

**Permissions:** `lesson:edit`

**Request Body:**
```json
{
  "lessons": [
    { "id": 101, "order": 1 },
    { "id": 102, "order": 2 },
    { "id": 103, "order": 3 }
  ]
}
```

**Validation Rules:**
- `lessons`: Array of lesson objects (required)
- Each lesson must have `id` (number) and `order` (non-negative number)
- All lessons must belong to the specified course

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Lessons reordered successfully",
  "data": {
    "courseId": 45,
    "lessons": [
      {
        "id": 101,
        "title": "Introduction",
        "order": 1,
        "duration": 10,
        "course_id": 45
      },
      {
        "id": 102,
        "title": "Chapter 1",
        "order": 2,
        "duration": 15,
        "course_id": 45
      },
      {
        "id": 103,
        "title": "Chapter 2",
        "order": 3,
        "duration": 12,
        "course_id": 45
      }
    ]
  }
}
```

**Error Responses:**
- `400 Bad Request` - Validation failed or lessons don't belong to course
- `403 Forbidden` - User doesn't own the course
- `404 Not Found` - Course not found

---

### 4. Get Video Processing Status

Get the current video processing status for a lesson.

**Endpoint:** `GET /api/courses/lessons/:lessonId/video-status`

**Permissions:** `lesson:view`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "lessonId": 123,
    "lessonTitle": "Introduction to Faith",
    "hasVideo": true,
    "videoStatus": "ready",
    "processingProgress": 100,
    "errorMessage": null,
    "fileSize": 52428800,
    "duration": 600,
    "uploadStartedAt": "2025-11-05T09:00:00.000Z",
    "lastUpdatedAt": "2025-11-05T09:15:00.000Z"
  }
}
```

**Video Status Values:**
- `no_video` - No video uploaded
- `uploading` - Video upload in progress
- `processing` - Video being transcoded/processed
- `ready` - Video ready for playback
- `error` - Processing failed

**Error Responses:**
- `403 Forbidden` - User doesn't have permission to view lesson
- `404 Not Found` - Lesson not found

---

## Permission Checks

All lesson modification endpoints verify that:
1. The user is authenticated
2. The user has the required permission
3. The user owns the course that the lesson belongs to (or is an admin)

Admins (`chapter_admin` or `platform_admin`) can modify any lesson.

## Course Statistics Updates

The following operations automatically update course statistics:
- **Update Lesson**: Recalculates total_duration when duration changes
- **Delete Lesson**: Updates lesson_count and total_duration
- **Reorder Lessons**: No statistics update needed

Statistics are computed on-the-fly in queries for accuracy.

## Error Handling

All endpoints follow a consistent error response format:

```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field": "Specific error message"
  }
}
```

## Rate Limiting

Lesson management endpoints use standard rate limiting:
- 100 requests per 15 minutes per user
- Shared with other course management endpoints

## Examples

### Example 1: Update Lesson Title and Duration

```bash
curl -X PUT http://localhost:5000/api/courses/lessons/123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Introduction to Orthodox Christianity",
    "duration": 20
  }'
```

### Example 2: Reorder Three Lessons

```bash
curl -X POST http://localhost:5000/api/courses/45/lessons/reorder \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lessons": [
      { "id": 103, "order": 1 },
      { "id": 101, "order": 2 },
      { "id": 102, "order": 3 }
    ]
  }'
```

### Example 3: Check Video Processing Status

```bash
curl -X GET http://localhost:5000/api/courses/lessons/123/video-status \
  -H "Authorization: Bearer <token>"
```

### Example 4: Delete a Lesson

```bash
curl -X DELETE http://localhost:5000/api/courses/lessons/123 \
  -H "Authorization: Bearer <token>"
```

## Testing

A test script is available at `backend/test-lesson-api.js` to verify all endpoints:

```bash
node backend/test-lesson-api.js
```

The test script covers:
- Lesson creation
- Lesson updates
- Video status retrieval
- Lesson reordering
- Validation rules
- Lesson deletion
- Permission checks

## Integration with Frontend

Frontend components should use these endpoints as follows:

### LessonEditor Component
```typescript
// Update lesson
const updateLesson = async (lessonId: number, data: LessonUpdateData) => {
  const response = await api.put(`/courses/lessons/${lessonId}`, data);
  return response.data;
};
```

### LessonList Component (Drag-and-Drop)
```typescript
// Reorder lessons
const reorderLessons = async (courseId: number, lessons: Array<{id: number, order: number}>) => {
  const response = await api.post(`/courses/${courseId}/lessons/reorder`, { lessons });
  return response.data;
};
```

### VideoUploader Component
```typescript
// Check video status
const checkVideoStatus = async (lessonId: number) => {
  const response = await api.get(`/courses/lessons/${lessonId}/video-status`);
  return response.data;
};
```

## Database Schema

Relevant tables:

### lessons
```sql
CREATE TABLE lessons (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  order INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  video_id INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  video_url TEXT,
  s3_key TEXT,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### videos
```sql
CREATE TABLE videos (
  id SERIAL PRIMARY KEY,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
  uploader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  storage_url TEXT NOT NULL,
  s3_key TEXT,
  size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'processing',
  processing_progress INTEGER DEFAULT 0,
  error_message TEXT,
  duration INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Security Considerations

1. **Ownership Verification**: All endpoints verify course ownership before allowing modifications
2. **Video Cleanup**: Deleted lessons trigger cloud storage cleanup to prevent orphaned files
3. **Input Validation**: All inputs are validated before database operations
4. **SQL Injection Prevention**: Using parameterized queries via Knex.js
5. **Rate Limiting**: Prevents abuse of lesson management endpoints

## Future Enhancements

Potential improvements for future iterations:
1. Bulk lesson operations (delete multiple, update multiple)
2. Lesson duplication/cloning
3. Lesson templates
4. Version history for lessons
5. Lesson preview before publishing
6. Scheduled lesson publishing
7. Lesson analytics (views, completion rates)
