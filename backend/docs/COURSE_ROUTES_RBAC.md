# Course Routes Role-Based Access Control

This document describes the role-based access control (RBAC) implementation for course-related API endpoints.

## Overview

The course routes implement strict role-based access control to ensure:
- Students can view and enroll in published courses
- Teachers can create and manage their own courses
- Admins can manage all courses
- Proper ownership validation prevents unauthorized modifications

## Role Hierarchy

```
platform_admin (Level 4) - Full access to all courses
    ↓
chapter_admin (Level 3) - Access to courses in their chapter
    ↓
teacher (Level 2) - Can create and manage own courses
    ↓
student (Level 1) - Can view and enroll in published courses
```

## Endpoint Access Matrix

| Endpoint | Method | Student | Teacher | Admin | Notes |
|----------|--------|---------|---------|-------|-------|
| `/catalog` | GET | ✓ | ✓ | ✓ | View published courses |
| `/` | GET | ✓ | ✓ | ✓ | View courses (filtered by role) |
| `/` | POST | ✗ | ✓ | ✓ | Create new course |
| `/:courseId` | GET | ✓* | ✓* | ✓ | View course details (*if enrolled/owner) |
| `/:courseId` | PUT | ✗ | ✓* | ✓ | Update course (*if owner) |
| `/:courseId` | DELETE | ✗ | ✓* | ✓ | Delete course (*if owner) |
| `/:courseId/analytics` | GET | ✗ | ✓* | ✓ | View analytics (*if owner) |
| `/:courseId/publish` | POST | ✗ | ✓* | ✓ | Publish course (*if owner) |
| `/:courseId/unpublish` | POST | ✗ | ✓* | ✓ | Unpublish course (*if owner) |
| `/:courseId/schedule-publish` | POST | ✗ | ✓* | ✓ | Schedule publishing (*if owner) |
| `/:courseId/enroll` | POST | ✓ | ✗ | ✗ | Enroll in course |
| `/:courseId/lessons` | POST | ✗ | ✓* | ✓ | Create lesson (*if owner) |
| `/:courseId/lessons/reorder` | POST | ✗ | ✓* | ✓ | Reorder lessons (*if owner) |
| `/lessons/:lessonId` | PUT | ✗ | ✓* | ✓ | Update lesson (*if owner) |
| `/lessons/:lessonId` | DELETE | ✗ | ✓* | ✓ | Delete lesson (*if owner) |
| `/lessons/:lessonId/video-status` | GET | ✓* | ✓* | ✓ | View video status (*if enrolled/owner) |
| `/lessons/:lessonId/video-url` | GET | ✓* | ✓* | ✓ | Get video URL (*if enrolled/owner) |
| `/lessons/:lessonId/download-url` | GET | ✓* | ✓* | ✓ | Get download URL (*if enrolled/owner) |
| `/bulk-action` | POST | ✗ | ✓ | ✓ | Bulk operations on courses |

**Legend:**
- ✓ = Allowed
- ✗ = Denied
- ✓* = Allowed with conditions (see Notes)

## Middleware Chain

Each endpoint uses a combination of middleware to enforce access control:

### 1. Authentication Middleware
```javascript
authenticateToken
```
- Applied to all routes via `router.use(authenticateToken)`
- Validates JWT token and attaches user info to `req.user`

### 2. Role Validation Middleware
```javascript
requireRole(['teacher', 'chapter_admin', 'platform_admin'])
```
- Checks if user's role matches one of the required roles
- Supports role hierarchy (higher roles can access lower-level routes)

### 3. Permission Validation Middleware
```javascript
requirePermission('course:view')
```
- Checks if user has specific permission based on their role
- Used for fine-grained access control

### 4. Ownership Validation Middleware
```javascript
requireOwnership('courses', { resourceParam: 'courseId' })
```
- Validates that the user owns the resource they're trying to modify
- Admins bypass ownership checks
- Teachers must own the course to modify it

## Access Control Examples

### Example 1: Student Viewing Catalog
```javascript
// Route: GET /api/courses/catalog
// Middleware: authenticateToken, requirePermission('course:view')
// Result: ✓ Allowed - All authenticated users can view catalog
```

### Example 2: Teacher Creating Course
```javascript
// Route: POST /api/courses
// Middleware: authenticateToken, requireRole(['teacher', 'chapter_admin', 'platform_admin'])
// Result: ✓ Allowed - Teachers can create courses
```

### Example 3: Student Attempting to Create Course
```javascript
// Route: POST /api/courses
// Middleware: authenticateToken, requireRole(['teacher', 'chapter_admin', 'platform_admin'])
// Result: ✗ Denied - Students cannot create courses
// Response: 403 Forbidden with error details
```

### Example 4: Teacher Editing Own Course
```javascript
// Route: PUT /api/courses/:courseId
// Middleware: authenticateToken, requireRole(['teacher', ...]), requireOwnership('courses')
// Result: ✓ Allowed - Teacher owns the course
```

### Example 5: Teacher Editing Another Teacher's Course
```javascript
// Route: PUT /api/courses/:courseId
// Middleware: authenticateToken, requireRole(['teacher', ...]), requireOwnership('courses')
// Result: ✗ Denied - Teacher doesn't own the course
// Response: 403 Forbidden with ownership error
```

### Example 6: Admin Editing Any Course
```javascript
// Route: PUT /api/courses/:courseId
// Middleware: authenticateToken, requireRole(['teacher', ...]), requireOwnership('courses')
// Result: ✓ Allowed - Admins bypass ownership checks
```

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "AUTHENTICATION_REQUIRED",
    "message": "Authentication required",
    "details": {
      "resource": "/api/courses"
    }
  }
}
```

### 403 Forbidden - Insufficient Role
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_ROLE",
    "message": "Access denied: Insufficient role privileges",
    "details": {
      "userRole": "student",
      "requiredRole": ["teacher", "chapter_admin", "platform_admin"],
      "resource": "/api/courses"
    }
  }
}
```

### 403 Forbidden - Ownership Required
```json
{
  "success": false,
  "error": {
    "code": "OWNERSHIP_REQUIRED",
    "message": "Access denied: You do not own this resource",
    "details": {
      "resourceType": "courses",
      "resourceId": "123",
      "userRole": "teacher",
      "userId": "456"
    }
  }
}
```

### 403 Forbidden - Insufficient Permission
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_PERMISSION",
    "message": "Access denied: Insufficient permissions",
    "details": {
      "userRole": "student",
      "requiredPermission": "course:create",
      "resource": "/api/courses"
    }
  }
}
```

## Controller-Level Access Control

In addition to middleware, some controllers implement additional access control logic:

### getCourse
- Students: Can view if enrolled in the course
- Teachers: Can view if they created the course
- Admins: Can view any course

### getUserCourses
- Students: Returns only enrolled courses
- Teachers: Returns only courses they created
- Admins: Returns all courses

### getCourseAnalytics
- Teachers: Can view analytics for courses they created
- Admins: Can view analytics for any course
- Students: Cannot access analytics

## Testing

Use the provided test script to verify RBAC implementation:

```bash
node backend/test-course-routes-rbac.js
```

The test script verifies:
1. Students can view catalog but not create courses
2. Teachers can create and manage their own courses
3. Admins have full access to all courses
4. Ownership validation prevents unauthorized modifications

## Security Considerations

1. **Defense in Depth**: Access control is enforced at multiple layers:
   - Middleware (route-level)
   - Controller (business logic level)
   - Database (foreign key constraints)

2. **Role Hierarchy**: Higher-level roles automatically have access to lower-level routes

3. **Ownership Validation**: Teachers can only modify courses they created (unless they're admins)

4. **Enrollment Validation**: Students can only access course content if enrolled

5. **Audit Logging**: All access denials are logged for security monitoring

## Migration Notes

When updating existing code:

1. Replace `requirePermission` with `requireRole` for clearer role-based access
2. Add `requireOwnership` middleware for modification endpoints
3. Update error handling to use standardized error responses
4. Test all endpoints with different user roles

## Related Documentation

- [RBAC Middleware](../middleware/rbac.js)
- [Course API Endpoints](./COURSE_API_ENDPOINTS.md)
- [Course Management API](./course-management-api.md)
