# RBAC Missing Components Analysis

## Executive Summary

After a thorough analysis of the Role-Based Access Control (RBAC) implementation, several critical gaps have been identified that need to be addressed for a complete and secure RBAC system.

---

## 1. **Duplicate RBAC Middleware Implementations**

### Issue
There are **two separate RBAC middleware files** with conflicting implementations:

- **`backend/middleware/rbac.js`** - Full implementation with database lookups
- **`backend/middleware/roles.js`** - Simplified version with hardcoded permissions

### Problems
- **Inconsistency**: Routes may use different RBAC implementations
- **Maintenance burden**: Changes must be made in two places
- **Security risk**: Hardcoded permissions in `roles.js` bypass database checks
- **Confusion**: Developers may not know which one to use

### Missing
- Consolidation of both implementations into a single source of truth
- Migration path from `roles.js` to `rbac.js`
- Documentation on which middleware to use

---

## 2. **Missing Roles in Database**

### Issue
The codebase references **7 roles**, but the database migrations/seeds only define **3 roles**.

### Roles Referenced in Code:
1. ✅ `student` - Defined in database
2. ✅ `teacher` - Defined in database  
3. ✅ `admin` - Defined in database
4. ❌ `guest` - **MISSING** from database
5. ❌ `youth` - **MISSING** from database
6. ❌ `moderator` - **MISSING** from database
7. ❌ `chapter_admin` - **MISSING** from database
8. ❌ `platform_admin` - **MISSING** from database

### Where Used:
- `guest`: Referenced in `User.js`, `authController.js`, `rbac.js` (hierarchy)
- `youth`: Referenced in `User.js`, `authController.js`, `rbac.js` (hierarchy), `youthPrivacyService.js`
- `moderator`: Referenced in `User.js`, `authController.js`, `rbac.js` (hierarchy), `moderation.js` routes
- `chapter_admin`: Referenced in `uptime.js`, `COURSE_ROUTES_RBAC.md`, `lessonValidation.js`
- `platform_admin`: Referenced in `uptime.js`, `User.js`, `authController.js`, `resourceLibraryController.js`

### Missing
- Database migration to add missing roles
- Seed data for missing roles
- Permission assignments for missing roles

---

## 3. **Missing Permissions in Database**

### Issue
The codebase uses **50+ permissions**, but the database only defines **17 permissions**.

### Missing Permissions by Category:

#### Quiz Permissions (4 missing):
- ❌ `quiz:take`
- ❌ `quiz:create`
- ❌ `quiz:edit_own`
- ❌ `quiz:edit_any`

#### Discussion Permissions (4 missing):
- ❌ `discussion:view`
- ❌ `discussion:create`
- ❌ `discussion:moderate`
- ❌ `discussion:delete_any`

#### Content Permissions (4 missing):
- ❌ `content:flag`
- ❌ `content:review`
- ❌ `content:manage`
- ❌ `content:view` (used in admin routes)

#### User Permissions (3 missing):
- ❌ `user:create` (used in admin routes)
- ❌ `user:edit_own`
- ❌ `user:edit_any`

#### Progress & Notes Permissions (3 missing):
- ❌ `progress:view`
- ❌ `notes:create`
- ❌ `notes:view_own`

#### Data & Audit Permissions (2 missing):
- ❌ `data:export` (used in admin routes)
- ❌ `audit:view` (used in admin routes)

#### Admin Permissions (2 missing):
- ❌ `admin:view` (used in resources.js)
- ❌ `admin:moderate` (used in resources.js)

#### Course Permissions (4 missing):
- ❌ `course:edit_own`
- ❌ `course:delete_own`
- ❌ `course:edit_any`
- ❌ `course:delete_any`

#### Lesson Permissions (4 missing):
- ❌ `lesson:edit_own`
- ❌ `lesson:delete_own`
- ❌ `lesson:edit_any`
- ❌ `lesson:delete_any`

#### Video Permissions (2 missing):
- ❌ `video:delete_own`
- ❌ `video:delete_any`

#### Chapter Permissions (2 missing):
- ❌ `chapter:view`
- ❌ `chapter:manage`

#### Analytics Permissions (1 missing):
- ❌ `analytics:view_own`

### Where Used:
- Routes in `admin.js`, `interactive.js`, `resources.js` use permissions not in database
- Controllers in `authController.js`, `User.js` define permissions not in database
- These will fail when `requirePermission` queries the database

### Missing
- Migration to add all missing permissions
- Seed data for all missing permissions
- Role-permission mappings for all roles

---

## 4. **Incomplete Role Hierarchy**

### Issue
The role hierarchy in `rbac.js` is incomplete and inconsistent.

### Current Hierarchy:
```javascript
const ROLE_HIERARCHY = {
  'guest': 0,
  'youth': 1,
  'student': 1,
  'moderator': 2,
  'teacher': 2,
  'admin': 3
};
```

### Problems:
1. **Missing roles**: `chapter_admin`, `platform_admin` not in hierarchy
2. **Same level conflicts**: `youth` and `student` both at level 1, `moderator` and `teacher` both at level 2
3. **Inconsistent with documentation**: `COURSE_ROUTES_RBAC.md` shows different hierarchy:
   ```
   platform_admin (Level 4)
   chapter_admin (Level 3)
   teacher (Level 2)
   student (Level 1)
   ```

### Missing
- Complete role hierarchy definition
- Documentation of hierarchy rules
- Consistent hierarchy across codebase

---

## 5. **Inconsistent Permission Checking**

### Issue
Different parts of the codebase use different permission checking methods.

### Examples:
1. **Routes using database-based `requirePermission`** (from `rbac.js`):
   - `courses.js`: `requirePermission('course:view')`
   - `admin.js`: `requirePermission('user:create')`
   - `interactive.js`: `requirePermission('quiz:take')`

2. **Routes using hardcoded `requirePermission`** (from `roles.js`):
   - `forums.js`: Uses `requirePermission` from `roles.js` (hardcoded)

3. **Routes using role-based checks**:
   - `courses.js`: `requireRole(['teacher', 'admin'])`
   - `moderation.js`: `requireRole(['moderator', 'admin'])`

4. **Controllers with hardcoded permission maps**:
   - `authController.js`: `getUserPermissions` uses hardcoded map
   - `User.js`: `getPermissions` uses hardcoded map

### Problems:
- Database permissions may not match hardcoded permissions
- Changes to permissions require updates in multiple places
- No single source of truth

### Missing
- Standardization on database-based permission checking
- Migration of all routes to use `rbac.js` middleware
- Removal of hardcoded permission maps

---

## 6. **Missing Role-Permission Mappings**

### Issue
The database seeds only map permissions to 3 roles, but the codebase uses 7 roles.

### Current Mappings (in `003_permissions.js`):
- ✅ `student` - 4 permissions mapped
- ✅ `teacher` - 13 permissions mapped
- ✅ `admin` - 17 permissions mapped

### Missing Mappings:
- ❌ `guest` - No permissions mapped
- ❌ `youth` - No permissions mapped
- ❌ `moderator` - No permissions mapped
- ❌ `chapter_admin` - No permissions mapped
- ❌ `platform_admin` - No permissions mapped

### Missing
- Permission mappings for all 7 roles
- Complete permission set for each role
- Documentation of role capabilities

---

## 7. **Missing Permission Validation**

### Issue
Routes use permissions that don't exist in the database, which will cause runtime errors.

### Examples:
- `admin.js` line 51: `requirePermission('data:export')` - Permission not in database
- `admin.js` line 62: `requirePermission('audit:view')` - Permission not in database
- `admin.js` line 13: `requirePermission('user:create')` - Permission not in database
- `admin.js` line 34: `requirePermission('content:manage')` - Permission not in database
- `resources.js` line 90: `requirePermission('admin:view')` - Permission not in database
- `interactive.js` line 14: `requirePermission('quiz:take')` - Permission not in database

### Missing
- Validation that all used permissions exist in database
- Error handling for missing permissions
- Migration script to add all required permissions

---

## 8. **Missing Ownership vs Any Permissions**

### Issue
The codebase distinguishes between `_own` and `_any` permissions, but the database only has generic permissions.

### Examples:
- Code uses: `course:edit_own`, `course:edit_any`
- Database has: `course:edit` (generic)

### Problems:
- Cannot distinguish between editing own content vs any content
- `requireOwnership` middleware handles this, but permission system doesn't support it
- Inconsistent permission model

### Missing
- Permission model that supports ownership-based permissions
- Middleware that checks both permission and ownership
- Clear documentation of ownership rules

---

## 9. **Missing Chapter-Based Access Control**

### Issue
The codebase references `chapter_admin` and chapter-based permissions, but:
- No chapter-based permission checking in middleware
- `requireChapterAccess` exists but may not be used consistently
- Chapter permissions not defined in database

### Missing
- Chapter-based permission model
- Middleware for chapter-level access control
- Permission mappings for chapter admins

---

## 10. **Missing Frontend-Backend Permission Sync**

### Issue
Frontend has its own permission checking logic that may not match backend.

### Examples:
- `AuthContext.tsx` has `PERMISSION_GROUPS` that may not match backend
- `ProtectedRoute.tsx` has role hierarchy that may not match backend
- Frontend permission checks may not align with database permissions

### Missing
- API endpoint to fetch user permissions from backend
- Frontend permission checking that uses backend data
- Sync mechanism between frontend and backend permissions

---

## 11. **Missing Permission Testing**

### Issue
The test file `test-rbac.js` exists but:
- Only tests basic login functionality
- Doesn't test permission checking
- Doesn't verify role-permission mappings
- Doesn't test missing permissions

### Missing
- Comprehensive RBAC test suite
- Tests for all roles and permissions
- Tests for permission denial scenarios
- Tests for role hierarchy

---

## 12. **Missing Documentation**

### Issue
RBAC documentation is incomplete:
- `ROLE_BASED_ROUTING_IMPLEMENTATION.md` is empty
- `COURSE_ROUTES_RBAC.md` exists but may be outdated
- No comprehensive RBAC guide

### Missing
- Complete RBAC documentation
- Permission reference guide
- Role capabilities documentation
- Migration guide for adding new permissions

---

## Priority Recommendations

### Critical (Fix Immediately):
1. ✅ Add all missing roles to database
2. ✅ Add all missing permissions to database
3. ✅ Map permissions to all roles
4. ✅ Consolidate RBAC middleware implementations
5. ✅ Fix routes using non-existent permissions

### High Priority:
6. ✅ Complete role hierarchy definition
7. ✅ Standardize permission checking across codebase
8. ✅ Add ownership-based permission support
9. ✅ Implement chapter-based access control

### Medium Priority:
10. ✅ Sync frontend-backend permissions
11. ✅ Add comprehensive RBAC tests
12. ✅ Complete RBAC documentation

---

## Next Steps

1. Create migration to add all missing roles
2. Create migration to add all missing permissions
3. Update seed file to map all permissions to all roles
4. Consolidate `rbac.js` and `roles.js` into single implementation
5. Update all routes to use consolidated RBAC middleware
6. Add validation for permission existence
7. Update role hierarchy to include all roles
8. Create comprehensive test suite
9. Update documentation

