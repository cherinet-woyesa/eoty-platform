# Design Document: Role-Based Routing Fix

## Overview

This design document outlines the architecture and implementation approach for fixing role-based routing issues in the LMS application. The solution ensures strict separation between student, teacher, and admin routes at both the frontend and backend levels, preventing users from accessing resources outside their role permissions.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Enhanced Route Protection Layer            │  │
│  │  - Role-based route guards                          │  │
│  │  - Automatic redirection logic                      │  │
│  │  - Navigation menu filtering                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Namespaced Route Structure              │  │
│  │  /student/*  │  /teacher/*  │  /admin/*             │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTP Requests (JWT Token)
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Backend API Layer                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Middleware Chain (Applied in Order)          │  │
│  │  1. authenticateToken                               │  │
│  │  2. requireRole / requirePermission                 │  │
│  │  3. Resource ownership validation                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Role-Specific Route Handlers               │  │
│  │  /api/students/*  │  /api/teacher/*  │  /api/admin/* │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Frontend Route Protection Components

#### Enhanced ProtectedRoute Component

**Location:** `frontend/src/components/routing/ProtectedRoute.tsx`

**Purpose:** Centralized route protection with role validation

**Interface:**
```typescript
interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  redirectTo?: string; // Custom redirect path on access denial
  allowedRoles?: string[]; // Alternative to requiredRole for clarity
}
```

**Key Features:**
- Validates user authentication status
- Checks role requirements against user's actual role
- Handles loading states during auth check
- Provides clear error messages on access denial
- Supports role hierarchy (admins can access lower-level routes)

#### Role-Specific Route Wrappers

**Location:** `frontend/src/components/routing/RoleRoutes.tsx`

**Purpose:** Simplified route components for each role

**Components:**
```typescript
// Student routes - accessible by students and above
<StudentRoute>
  <Component />
</StudentRoute>

// Teacher routes - accessible by teachers and above
<TeacherRoute>
  <Component />
</TeacherRoute>

// Admin routes - accessible by chapter_admin and platform_admin only
<AdminRoute>
  <Component />
</AdminRoute>
```

### 2. Route Configuration Structure

#### Namespaced Routes

**Student Routes** (`/student/*`):
- `/student/dashboard` - Student dashboard
- `/student/courses` - Browse course catalog
- `/student/courses/:courseId` - View enrolled course
- `/student/progress` - View learning progress
- `/student/achievements` - View achievements
- `/student/resources` - Access learning resources

**Teacher Routes** (`/teacher/*`):
- `/teacher/dashboard` - Teacher dashboard with metrics
- `/teacher/courses` - Manage owned courses
- `/teacher/courses/:courseId` - Edit course details
- `/teacher/courses/:courseId/lessons` - Manage lessons
- `/teacher/students` - View enrolled students
- `/teacher/analytics` - View teaching analytics
- `/teacher/record` - Record video lessons

**Admin Routes** (`/admin/*`):
- `/admin/dashboard` - Admin dashboard
- `/admin/courses` - Manage all courses
- `/admin/courses/:courseId` - Admin course view
- `/admin/users` - User management
- `/admin/content` - Content management
- `/admin/moderation` - Moderation tools
- `/admin/analytics` - Platform analytics
- `/admin/config/*` - System configuration

### 3. Backend Middleware Enhancement

#### Consolidated Middleware Chain

**Location:** `backend/middleware/rbac.js`

**Enhanced Functions:**

```javascript
// Role validation with hierarchy support
const requireRole = (roles, options = {}) => {
  return (req, res, next) => {
    const { allowHigher = true, strict = false } = options;
    const userRole = req.user.role;
    
    // Role hierarchy
    const roleHierarchy = {
      'student': 1,
      'teacher': 2,
      'chapter_admin': 3,
      'platform_admin': 4
    };
    
    // Implementation details...
  };
};

// Permission validation with role context
const requirePermission = (permission, options = {}) => {
  return async (req, res, next) => {
    const { checkOwnership = false, resourceParam = 'id' } = options;
    
    // Implementation details...
  };
};

// Resource ownership validation
const requireOwnership = (resourceType) => {
  return async (req, res, next) => {
    // Validates that the user owns or has access to the resource
    // Implementation details...
  };
};
```

### 4. Authentication Context Enhancement

#### Enhanced AuthContext

**Location:** `frontend/src/context/AuthContext.tsx`

**Additional Methods:**
```typescript
interface AuthContextType {
  // Existing methods...
  user: User | null;
  isAuthenticated: boolean;
  
  // Enhanced methods
  hasRole: (role: string | string[]) => boolean;
  hasPermission: (permission: string) => boolean;
  canAccessRoute: (path: string) => boolean;
  getRoleDashboard: () => string;
  isRoleOrHigher: (role: string) => boolean;
}
```

### 5. Navigation Menu Filtering

#### RoleBasedNavigation Component

**Location:** `frontend/src/components/layout/RoleBasedNavigation.tsx`

**Purpose:** Dynamically filter navigation items based on user role

**Implementation:**
```typescript
interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  requiredRole?: string | string[];
  requiredPermission?: string;
  children?: NavItem[];
}

const filterNavItems = (items: NavItem[], user: User): NavItem[] => {
  // Filter logic based on role and permissions
};
```

## Data Models

### JWT Token Payload Enhancement

```typescript
interface JWTPayload {
  userId: number;
  email: string;
  role: 'student' | 'teacher' | 'chapter_admin' | 'platform_admin';
  chapterId?: number;
  permissions: string[]; // Cached permissions for quick validation
  iat: number;
  exp: number;
}
```

### Route Configuration Model

```typescript
interface RouteConfig {
  path: string;
  component: React.ComponentType;
  requiredRole?: string | string[];
  requiredPermission?: string;
  exact?: boolean;
  redirectTo?: string;
  layout?: React.ComponentType;
}
```

## Error Handling

### Frontend Error Pages

#### AccessDenied Component

**Location:** `frontend/src/pages/errors/AccessDenied.tsx`

**Features:**
- Display user's current role
- Show required role for the attempted route
- Provide link to user's appropriate dashboard
- Log access attempt for security audit

#### RoleRedirect Component

**Location:** `frontend/src/components/routing/RoleRedirect.tsx`

**Purpose:** Automatic redirection with user feedback

**Features:**
- Show brief message explaining redirection
- Redirect to role-appropriate route
- Preserve query parameters when possible

### Backend Error Responses

**Standardized Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_ROLE",
    "message": "Access denied: Admin role required",
    "details": {
      "userRole": "teacher",
      "requiredRole": ["chapter_admin", "platform_admin"],
      "resource": "/api/admin/users"
    }
  }
}
```

## Testing Strategy

### Frontend Testing

#### Unit Tests
- Test ProtectedRoute component with different role combinations
- Test role-based navigation filtering
- Test dashboard redirection logic
- Test AuthContext role validation methods

#### Integration Tests
- Test complete user flows for each role
- Test cross-role access attempts
- Test navigation between allowed routes
- Test error page rendering

### Backend Testing

#### Unit Tests
- Test middleware functions with different roles
- Test permission validation logic
- Test resource ownership validation
- Test role hierarchy enforcement

#### Integration Tests
- Test API endpoints with different user roles
- Test unauthorized access attempts
- Test token validation with role information
- Test error response formats

### End-to-End Tests
- Test complete user journeys for each role
- Test login and automatic dashboard redirection
- Test navigation menu visibility
- Test direct URL access attempts
- Test browser back/forward navigation

## Implementation Phases

### Phase 1: Backend Middleware Consolidation
1. Enhance RBAC middleware with role hierarchy
2. Add resource ownership validation
3. Apply consistent middleware to all routes
4. Update error responses

### Phase 2: Frontend Route Protection
1. Create enhanced ProtectedRoute component
2. Implement role-specific route wrappers
3. Restructure routes with proper namespacing
4. Add dashboard redirection logic

### Phase 3: Navigation and UI Updates
1. Implement role-based navigation filtering
2. Update sidebar components for each role
3. Create access denied error pages
4. Add role indicators in UI

### Phase 4: Testing and Validation
1. Write unit tests for all components
2. Create integration tests for routes
3. Perform manual testing for each role
4. Security audit and penetration testing

## Security Considerations

### Defense in Depth
- Frontend route protection (UX layer)
- Backend middleware validation (Security layer)
- Database-level permissions (Data layer)

### Token Security
- Include role in JWT payload
- Validate role on every request
- Invalidate tokens on role changes
- Use short token expiration times

### Audit Logging
- Log all access denial attempts
- Track role changes
- Monitor suspicious access patterns
- Alert on repeated unauthorized attempts

## Performance Considerations

### Caching Strategy
- Cache user permissions in JWT token
- Cache role-based navigation menus
- Minimize database queries for permission checks

### Optimization
- Lazy load role-specific components
- Preload role-appropriate routes
- Minimize re-renders on auth state changes

## Migration Strategy

### Backward Compatibility
- Maintain legacy route redirects
- Gradual rollout of new route structure
- Support both old and new routes during transition

### User Communication
- Notify users of route changes
- Update bookmarks and saved links
- Provide migration guide for developers

## Monitoring and Maintenance

### Metrics to Track
- Access denial rate by role
- Most frequently accessed routes by role
- Average time to dashboard load
- Token validation failures

### Alerts
- Unusual access patterns
- High rate of access denials
- Token validation errors
- Role escalation attempts
