# Implementation Plan: Role-Based Routing Fix

- [x] 1. Enhance backend RBAC middleware




  - Create consolidated role validation with hierarchy support
  - Add resource ownership validation middleware
  - Implement standardized error responses for access denials

  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5, 8.1, 8.2, 8.4_

- [x] 1.1 Update rbac.js middleware with role hierarchy

  - Implement `isRoleOrHigher` function to check role hierarchy
  - Update `requireRole` to support hierarchy checking with options
  - Add role hierarchy constants (student=1, teacher=2, chapter_admin=3, platform_admin=4)
  - _Requirements: 2.2, 6.2_


- [x] 1.2 Create resource ownership validation middleware

  - Implement `requireOwnership` middleware for course resources
  - Add ownership checking for lessons, videos, and other user-created content
  - Integrate ownership validation with existing permission checks
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


- [x] 1.3 Standardize error responses across all middleware

  - Create error response utility function with consistent format
  - Update all middleware to use standardized error responses
  - Include user role, required role, and resource information in errors
  - _Requirements: 2.3, 9.2, 9.4_

- [-] 2. Apply consistent middleware to all backend routes



  - Audit all route files for missing or incorrect middleware
  - Apply appropriate role/permission middleware to each endpoint
  - Ensure authentication middleware is applied before role checks
  - Document required roles and permissions for each endpoint
  - _Requirements: 2.1, 2.2, 2.4, 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 2.1 Update admin routes with consistent middleware

  - Verify all `/api/admin/*` routes use `requireAdmin` middleware
  - Add permission checks for specific admin operations
  - Test admin route access with different roles
  - _Requirements: 2.2, 6.3_


- [x] 2.2 Update teacher routes with consistent middleware

  - Verify all `/api/teacher/*` routes use `requireRole(['teacher', 'chapter_admin', 'platform_admin'])`
  - Add ownership validation for teacher-created resources
  - Test teacher route access with different roles
  - _Requirements: 2.2, 6.4, 7.2_


- [x] 2.3 Update student routes with consistent middleware

  - Verify all `/api/students/*` routes have proper authentication
  - Add enrollment validation for course access
  - Test student route access with different roles
  - _Requirements: 2.1, 2.2, 7.1_



- [x] 2.4 Update courses routes with role-based access




  - Apply different middleware based on operation (view vs edit vs delete)
  - Add ownership validation for course modifications
  - Ensure catalog endpoints are accessible to all authenticated users
  - _Requirements: 2.2, 2.4, 7.1, 7.2, 7.3_

- [x] 3. Create enhanced frontend route protection components



  - Build reusable ProtectedRoute component with role validation
  - Create role-specific route wrapper components
  - Implement loading states and error handling
  - Add automatic redirection for unauthorized access
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.4_

- [x] 3.1 Create ProtectedRoute component


  - Implement role validation logic with hierarchy support
  - Add permission checking capability
  - Create loading spinner for auth state checks
  - Build access denied UI with role information
  - _Requirements: 1.1, 1.2, 1.3, 9.1_


- [x] 3.2 Create role-specific route wrapper components

  - Implement StudentRoute component (accessible by all roles)
  - Implement TeacherRoute component (accessible by teacher and above)
  - Implement AdminRoute component (accessible by admins only)
  - Add optional permission prop to each wrapper
  - _Requirements: 1.1, 1.4_


- [x] 3.3 Create RoleRedirect component for automatic redirects

  - Implement redirect logic based on user role
  - Show brief feedback message during redirect
  - Preserve query parameters when redirecting
  - _Requirements: 4.4, 4.5_

- [x] 4. Restructure App.tsx with namespaced routes



  - Organize routes under role-specific prefixes
  - Implement dashboard redirection logic
  - Remove or update conflicting route definitions
  - Add proper route guards to all protected routes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4_


- [x] 4.1 Implement DynamicDashboard component

  - Create logic to redirect users to role-appropriate dashboard
  - Handle edge cases (no role, invalid role)
  - Preserve query parameters during redirection
  - _Requirements: 4.1, 4.2, 4.3, 4.5_

- [x] 4.2 Restructure student routes under /student prefix

  - Move student dashboard to `/student/dashboard`
  - Move course catalog to `/student/courses`
  - Move course details to `/student/courses/:courseId`
  - Add redirects from legacy routes
  - _Requirements: 3.1, 3.5_


- [x] 4.3 Restructure teacher routes under /teacher prefix
  - Move teacher dashboard to `/teacher/dashboard`
  - Move course management to `/teacher/courses`
  - Move student management to `/teacher/students`
  - Move video recording to `/teacher/record`
  - Add redirects from legacy routes
  - _Requirements: 3.2, 3.5_


- [x] 4.4 Restructure admin routes under /admin prefix
  - Verify all admin routes use `/admin` prefix
  - Ensure consistent AdminRoute wrapper usage
  - Add redirects from legacy routes

  - _Requirements: 3.3, 3.5_

- [x] 4.5 Add route conflict resolution
  - Ensure specific routes are defined before parameterized routes
  - Remove duplicate route definitions
  - Test route matching with various URLs
  - _Requirements: 3.4_

- [x] 5. Enhance AuthContext with role validation methods



  - Add hasRole method for role checking
  - Add canAccessRoute method for route validation
  - Add getRoleDashboard method for redirection
  - Add isRoleOrHigher method for hierarchy checking
  - Update existing hasPermission method
  - _Requirements: 1.1, 1.4, 4.1, 4.2, 4.3, 8.4_


- [x] 5.1 Implement role validation methods in AuthContext

  - Create `hasRole(role: string | string[]): boolean` method
  - Create `isRoleOrHigher(role: string): boolean` method with hierarchy
  - Create `getRoleDashboard(): string` method
  - Update context type definitions
  - _Requirements: 1.1, 1.4, 4.1, 4.2, 4.3_


- [x] 5.2 Implement route access validation in AuthContext
  - Create `canAccessRoute(path: string): boolean` method
  - Map routes to required roles
  - Handle wildcard and parameterized routes
  - _Requirements: 1.1, 1.3_


- [x] 5.3 Add role change detection and token invalidation
  - Detect when user role changes
  - Clear authentication state on role change
  - Force re-authentication when role changes
  - _Requirements: 1.5, 8.3_

- [-] 6. Implement role-based navigation filtering



  - Create navigation configuration with role requirements
  - Filter navigation items based on user role
  - Update sidebar components to use filtered navigation
  - Add role indicator in navigation UI
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


- [x] 6.1 Create navigation configuration with role metadata

  - Define navigation items with required roles and permissions
  - Support nested navigation items
  - Add icons and labels for each item
  - _Requirements: 5.1, 5.4_


- [x] 6.2 Implement navigation filtering utility

  - Create `filterNavItems` function based on user role
  - Handle nested navigation items
  - Hide parent items when all children are inaccessible
  - _Requirements: 5.1, 5.2, 5.4_


- [x] 6.3 Update AdminSidebar with role-based filtering

  - Apply navigation filtering to admin sidebar
  - Show only admin-accessible items
  - Add role indicator showing current user role
  - _Requirements: 5.1, 5.3, 5.5_


- [x] 6.4 Update TeacherSidebar with role-based filtering
  - Create or update teacher sidebar component
  - Apply navigation filtering for teacher role
  - Show teacher-specific navigation items
  - _Requirements: 5.1, 5.3_

- [x] 6.5 Update StudentSidebar with role-based filtering
  - Create or update student sidebar component
  - Apply navigation filtering for student role
  - Show student-specific navigation items
  - _Requirements: 5.1, 5.3_

- [ ] 7. Create access denied and error pages
  - Build AccessDenied component with role information
  - Create RoleError component for role-specific errors
  - Add navigation back to appropriate dashboard
  - Implement error logging for security audit
  - _Requirements: 1.2, 9.1, 9.3, 9.4, 9.5_

- [x] 7.1 Create AccessDenied error page component

  - Display user's current role
  - Show required role for attempted route
  - Provide link to user's role-appropriate dashboard
  - Add visual styling for error state
  - _Requirements: 1.2, 9.1, 9.3_


- [x] 7.2 Implement error logging for access denials

  - Log access denial attempts with user ID and route
  - Include timestamp and user role in logs
  - Send logs to backend for security audit
  - _Requirements: 9.4_


- [x] 7.3 Create helpful error messages and suggestions
  - Provide context-specific error messages
  - Suggest alternative routes user can access
  - Add contact information for access requests
  - _Requirements: 9.2, 9.5_

- [x] 8. Update JWT token generation with role information
  - Ensure role is included in JWT payload
  - Add permissions array to token payload
  - Update token validation to extract role
  - Implement token invalidation on role changes
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 8.1 Update authController to include role in JWT
  - Modify token generation to include user role
  - Add permissions array to token payload
  - Set appropriate token expiration time
  - _Requirements: 8.1_

- [x] 8.2 Update auth middleware to validate role from token
  - Extract role from JWT payload
  - Attach role to req.user object
  - Validate role format and value
  - _Requirements: 8.2, 8.4_

- [x] 8.3 Implement token invalidation on role changes
  - Create mechanism to invalidate tokens when role changes
  - Force re-authentication after role change
  - Clear client-side auth state
  - _Requirements: 8.3_

- [x] 9. Add comprehensive logging and monitoring
  - Log all access denial attempts
  - Track role-based route access patterns
  - Monitor unauthorized API calls
  - Create security audit reports
  - _Requirements: 2.5, 9.4_

- [x] 9.1 Implement access denial logging
  - Log frontend route access denials
  - Log backend API access denials
  - Include user ID, role, attempted resource, and timestamp
  - _Requirements: 2.5, 9.4_

- [x] 9.2 Create security audit log viewer
  - Build admin interface to view access logs
  - Add filtering by user, role, and time period
  - Show patterns of unauthorized access attempts
  - _Requirements: 2.5, 9.4_

- [ ] 10. Write comprehensive tests for role-based routing
  - Create unit tests for route protection components
  - Write integration tests for role-based access
  - Test dashboard redirection for each role
  - Test navigation filtering for each role
  - Test backend middleware with different roles
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 10.1 Write unit tests for ProtectedRoute component
  - Test with different role combinations
  - Test loading states
  - Test error states and access denial
  - Test redirection logic
  - _Requirements: 10.1_

- [ ] 10.2 Write integration tests for route access
  - Test student accessing student routes (should succeed)
  - Test student accessing teacher routes (should fail)
  - Test student accessing admin routes (should fail)
  - Test teacher accessing teacher and student routes (should succeed)
  - Test teacher accessing admin routes (should fail)
  - Test admin accessing all routes (should succeed)
  - _Requirements: 10.1, 10.2_

- [ ] 10.3 Write tests for dashboard redirection
  - Test student redirected to /student/dashboard
  - Test teacher redirected to /teacher/dashboard
  - Test admin redirected to /admin/dashboard
  - Test query parameter preservation
  - _Requirements: 10.3_

- [ ] 10.4 Write tests for backend middleware
  - Test requireRole middleware with different roles
  - Test requirePermission middleware
  - Test requireOwnership middleware
  - Test error responses
  - _Requirements: 10.4_

- [ ] 10.5 Write tests for navigation filtering
  - Test navigation items shown for student role
  - Test navigation items shown for teacher role
  - Test navigation items shown for admin role
  - Test nested navigation item filtering
  - _Requirements: 10.5_

- [ ] 11. Update documentation and migration guide
  - Document new route structure
  - Create migration guide for developers
  - Update API documentation with role requirements
  - Document testing procedures
  - _Requirements: All requirements_

- [ ] 11.1 Create route structure documentation
  - Document all student routes with required roles
  - Document all teacher routes with required roles
  - Document all admin routes with required roles
  - Include examples of route usage
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 11.2 Create developer migration guide
  - Document changes to route structure
  - Provide examples of updating existing code
  - List breaking changes and how to fix them
  - Include testing checklist
  - _Requirements: All requirements_

- [ ] 11.3 Update API documentation with role requirements
  - Add role requirements to each endpoint
  - Document permission requirements
  - Include example requests and responses
  - Document error responses
  - _Requirements: 6.5, 9.2_
