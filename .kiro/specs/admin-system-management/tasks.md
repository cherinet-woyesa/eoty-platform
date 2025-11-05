# Implementation Plan

## Overview

This implementation plan breaks down the Admin System Management feature into discrete, manageable coding tasks. Each task builds incrementally on previous work, following the 5-phase migration strategy outlined in the design document.

---

## Phase 1: Database Setup and Migrations

- [x] 1. Create database schema for system configuration









- [x] 1.1 Create migration for course_categories table




  - Add id, name, slug, icon, description, display_order, is_active columns
  - Add indexes for active_order and slug
  - Add foreign key to users table for created_by
  - _Requirements: 2.1, 2.2_

- [x] 1.2 Create migration for course_levels table


  - Add id, name, slug, description, display_order, is_active columns
  - Add indexes for active_order and slug
  - Add foreign key to users table for created_by
  - _Requirements: 3.1, 3.2_

- [x] 1.3 Create migration for course_durations table


  - Add id, value, label, weeks_min, weeks_max, display_order, is_active columns
  - Add index for active_order
  - Add foreign key to users table for created_by
  - _Requirements: 4.1, 4.2_

- [x] 1.4 Create migration to enhance content_tags table


  - Add category, color, display_order, usage_count columns
  - Add indexes for category and usage_count
  - _Requirements: 5.1, 5.2_

- [x] 1.5 Create migration to enhance chapters table


  - Add description, display_order, course_count columns
  - Add index for active_order
  - _Requirements: 6.1, 6.2_

- [x] 1.6 Create migration for system_config_audit table


  - Add id, admin_id, entity_type, entity_id, action_type columns
  - Add before_state, after_state JSONB columns
  - Add ip_address, user_agent, created_at columns
  - Add indexes for entity, admin, and created_at
  - _Requirements: 11.1, 11.2_

---

## Phase 2: Data Migration and Seeding

- [x] 2. Migrate hardcoded values to database






- [x] 2.1 Create seed script for course categories


  - Migrate hardcoded CATEGORIES array from CourseEditor
  - Insert faith, history, spiritual, bible, liturgical, youth categories
  - Set appropriate display_order and icons
  - _Requirements: 2.1, 2.2_

- [x] 2.2 Create seed script for course levels


  - Migrate hardcoded LEVELS array from CourseEditor
  - Insert beginner, intermediate, advanced levels
  - Set appropriate display_order and descriptions
  - _Requirements: 3.1, 3.2_

- [x] 2.3 Create seed script for course durations


  - Migrate hardcoded DURATIONS array from CourseEditor
  - Insert 1-2, 3-4, 5-8, 9+ week options
  - Set appropriate display_order and week ranges
  - _Requirements: 4.1, 4.2_

- [x] 2.4 Create migration script to update existing courses


  - Update courses.category to reference course_categories.slug
  - Update courses.level to reference course_levels.slug
  - Update courses.estimated_duration to reference course_durations.value
  - Calculate and update usage_count for all entities
  - _Requirements: 2.5, 3.4, 4.4_

---

## Phase 3: Backend Implementation

- [x] 3. Implement backend API and controllers





- [x] 3.1 Create TypeScript interfaces for system config


  - Define CourseCategory, CourseLevel, CourseDuration interfaces
  - Define EnhancedTag, EnhancedChapter interfaces
  - Define ConfigAuditLog, SystemConfigMetrics interfaces
  - _Requirements: All_

- [x] 3.2 Create system config controller


  - Implement getMetrics() for dashboard overview
  - Implement getCategories(), createCategory(), updateCategory(), deleteCategory()
  - Implement getLevels(), createLevel(), updateLevel(), deleteLevel()
  - Implement getDurations(), createDuration(), updateDuration(), deleteDuration()
  - _Requirements: 2.1-2.5, 3.1-3.5, 4.1-4.5, 12.1-12.5_

- [x] 3.3 Implement tag and chapter management


  - Implement getTags(), createTag(), updateTag(), deleteTag()
  - Implement mergeTags() for tag consolidation
  - Implement getChapters(), createChapter(), updateChapter(), deleteChapter()
  - _Requirements: 5.1-5.5, 6.1-6.5_


- [x] 3.4 Implement bulk operations

  - Create bulkActionCategories() for activate/deactivate/delete
  - Create bulkActionLevels() for activate/deactivate/delete
  - Create bulkActionDurations() for activate/deactivate/delete
  - Create bulkActionTags() and bulkActionChapters()
  - _Requirements: 8.1-8.5_

- [x] 3.5 Implement reordering functionality

  - Create reorderCategories() to update display_order
  - Create reorderLevels() to update display_order
  - Handle drag-and-drop order updates
  - _Requirements: 3.3, 4.5_

- [x] 3.6 Create validation middleware


  - Implement category validation rules
  - Implement level validation rules (ensure at least one active)
  - Implement duration validation rules
  - Implement tag and chapter validation rules
  - _Requirements: 2.2, 3.2, 4.2, 5.2, 6.2_


- [x] 3.7 Implement audit logging service

  - Create logConfigChange() function
  - Capture before/after states
  - Record admin_id, IP address, user agent
  - Implement getAuditLogs() with filtering
  - _Requirements: 11.1-11.5_


- [x] 3.8 Implement usage analytics

  - Create getUsageDetails() to show courses using an option
  - Calculate and cache usage counts
  - Update usage counts on course create/update/delete

  - _Requirements: 10.1-10.5_

- [x] 3.9 Create system config routes

  - Define routes for all CRUD operations
  - Add authentication and admin authorization middleware
  - Implement rate limiting for bulk operations
  - Mount routes in app.js
  - _Requirements: All_

---

## Phase 4: Frontend Implementation

- [x] 4. Create shared configuration components




- [x] 4.1 Create TypeScript types for system config

  - Create frontend/src/types/systemConfig.ts
  - Define all interfaces matching backend models
  - Export types for use across components
  - _Requirements: All_


- [x] 4.2 Create API client for system config

  - Create frontend/src/services/api/systemConfig.ts
  - Implement methods for all CRUD operations
  - Implement bulk action methods
  - Implement audit log fetching
  - _Requirements: All_



- [x] 4.3 Create reusable ConfigEditor component

  - Build form with gradient header matching CourseEditor
  - Implement field validation with error display
  - Add auto-save functionality
  - Add loading states with Spinner and LoadingButton
  - Use NotificationSystem for feedback
  - _Requirements: 7.1-7.5, 13.1-13.5_

- [x] 4.4 Create reusable ConfigTable component

  - Build table with sorting, filtering, pagination
  - Add bulk selection checkboxes
  - Display usage counts with tooltips
  - Show active/inactive status badges
  - Implement search functionality
  - _Requirements: 7.4, 9.1-9.5_

- [x] 4.5 Create BulkActionBar component

  - Add activate, deactivate, delete buttons

  - Show confirmation dialog with affected item count
  - Display success/error summary after operation
  - Handle dependency errors gracefully
  - _Requirements: 8.1-8.5_

- [x] 4.6 Create UsageAnalytics component

  - Display usage count badges
  - Show tooltip with trend information
  - Implement modal to list courses using option
  - Highlight zero-usage items
  - _Requirements: 10.1-10.5_

---

- [x] 5. Implement System Config Dashboard




- [x] 5.1 Create SystemConfigDashboard page

  - Create frontend/src/pages/admin/config/SystemConfigDashboard.tsx
  - Display metric cards for each configuration type
  - Show total, active, and inactive counts
  - Add quick action buttons
  - Display recent configuration changes timeline
  - _Requirements: 12.1-12.5_


- [x] 5.2 Style dashboard with teacher interface design





  - Use white rounded cards with gradient headers
  - Apply consistent spacing and shadows
  - Match CourseEditor color scheme
  - Ensure responsive layout
  - _Requirements: 7.1-7.5, 13.1-13.5_

---

- [x] 6. Implement Category Management




- [x] 6.1 Create CategoryManagement page

  - Create frontend/src/pages/admin/config/CategoryManagement.tsx
  - Display ConfigTable with all categories
  - Show name, icon, description, usage count, status
  - Add "New Category" button
  - _Requirements: 2.1_


- [x] 6.2 Implement category CRUD operations

  - Create category form with name, icon, description fields
  - Implement create, update, delete operations
  - Add icon picker for Lucide icons
  - Validate uniqueness and length constraints
  - _Requirements: 2.2, 2.3, 2.4_


- [x] 6.3 Add category reordering
  - Implement drag-and-drop reordering
  - Update display_order on server
  - Show visual feedback during drag
  - _Requirements: 2.3_


- [x] 6.4 Implement category bulk actions

  - Add bulk activate/deactivate functionality
  - Prevent deletion of categories in use
  - Show detailed error messages
  - _Requirements: 2.4, 2.5, 8.1-8.5_

---

- [x] 7. Implement Level Management




- [x] 7.1 Create LevelManagement page


  - Create frontend/src/pages/admin/config/LevelManagement.tsx
  - Display ConfigTable with all levels
  - Show name, description, usage count, status
  - Add "New Level" button
  - _Requirements: 3.1_

- [x] 7.2 Implement level CRUD operations


  - Create level form with name and description fields
  - Implement create, update, delete operations
  - Validate uniqueness and length constraints
  - Prevent deactivating last active level
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 7.3 Add level reordering


  - Implement drag-and-drop reordering
  - Update display_order on server
  - Reflect changes in CourseEditor immediately
  - _Requirements: 3.3_

- [x] 7.4 Implement level bulk actions


  - Add bulk activate/deactivate functionality
  - Ensure at least one level remains active
  - Show validation errors
  - _Requirements: 3.4, 3.5, 8.1-8.5_

---
-

- [x] 8. Implement Duration Management




- [x] 8.1 Create DurationManagement page


  - Create frontend/src/pages/admin/config/DurationManagement.tsx
  - Display ConfigTable with all durations
  - Show value, label, week range, usage count, status
  - Add "New Duration" button
  - _Requirements: 4.1_


- [x] 8.2 Implement duration CRUD operations

  - Create duration form with value, label, weeks fields
  - Implement create, update, delete operations
  - Validate format (e.g., "1-2", "9+")
  - Validate uniqueness
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 8.3 Add automatic sorting by duration

  - Sort durations by weeks_min ascending
  - Display in correct order in tables and dropdowns
  - _Requirements: 4.5_

- [x] 8.4 Implement duration bulk actions

  - Add bulk activate/deactivate functionality
  - Prevent deletion of durations in use
  - Show detailed error messages
  - _Requirements: 4.4, 8.1-8.5_

---


- [x] 9. Implement Enhanced Tag Management



- [x] 9.1 Create TagManagement page


  - Create frontend/src/pages/admin/config/TagManagement.tsx
  - Display ConfigTable with all tags
  - Show name, category, color badge, usage count, status
  - Add "New Tag" button
  - _Requirements: 5.1_

- [x] 9.2 Implement tag CRUD operations

  - Create tag form with name, category, color fields
  - Add color picker for tag colors
  - Implement create, update, delete operations
  - Validate format (alphanumeric with hyphens)
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 9.3 Implement tag merging functionality


  - Add "Merge Tags" button
  - Show dialog to select source and target tags
  - Reassign all courses from source to target
  - Delete source tag after merge
  - _Requirements: 5.3_

- [x] 9.4 Add tag sorting by usage

  - Sort tags by usage_count descending
  - Show most popular tags first
  - _Requirements: 5.5_

- [x] 9.5 Implement tag bulk actions

  - Add bulk activate/deactivate functionality
  - Prevent deletion of tags in use
  - Show detailed error messages
  - _Requirements: 5.4, 8.1-8.5_

---

-

- [x] 10. Implement Chapter Management




- [x] 10.1 Create ChapterManagement page

  - Create frontend/src/pages/admin/config/ChapterManagement.tsx
  - Display ConfigTable with all chapters
  - Show name, description, course count, status
  - Add "New Chapter" button
  - _Requirements: 6.1_


- [x] 10.2 Implement chapter CRUD operations

  - Create chapter form with name and description fields
  - Implement create, update operations
  - Validate uniqueness and length constraints
  - Prevent deletion if course_count > 0
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 10.3 Implement chapter bulk actions


  - Add bulk activate/deactivate functionality
  - Prevent deletion of chapters with courses
  - Show course count in error messages
  - _Requirements: 6.4, 6.5, 8.1-8.5_

---

- [x] 11. Implement Audit Log Viewer












- [x] 11.1 Create AuditLogViewer component

  - Create frontend/src/components/admin/config/AuditLogViewer.tsx
  - Display audit logs in reverse chronological order
  - Show admin name, action, entity, timestamp
  - _Requirements: 11.2_

-


- [x] 11.2 Add audit log filtering





  - Add filters for date range, admin user, action type, entity type
  - Implement search functionality
  - Add pagination for large result sets
  - _Requirements: 11.3_


-

- [x] 11.3 Display before/after states


  - Show expandable diff view for changes
  - Highlight changed fields
  - Format JSON data readably
  - _Requirements: 11.5_

---




- [x] 12. Update Admin Navigation










- [x] 12.1 Update AdminSidebar component










  - Add "System Config" navigation item with Settings icon
  - Create expandable sub-menu for Categories, Levels, Durations, Tags, Chapters
  - Add badge indicators for inactive items
  - Maintain existing gradient design
  - _Requirements: 1.1-1.5_

- [x] 12.2 Add routes to App.tsx


  - Add routes for /admin/config/dashboard
  - Add routes for /admin/config/categories, levels, durations, tags, chapters
  - Wrap routes with AdminRoute for authorization
  - Use DashboardLayout for consistent layout
  - _Requirements: 1.1-1.5_

---

- [x] 13. Update CourseEditor to use dynamic options








- [x] 13.1 Replace hardcoded CATEGORIES array

  - Fetch categories from API using React Query
  - Filter to show only active categories
  - Sort by display_order
  - Cache results for performance
  - _Requirements: 2.3_



- [x] 13.2 Replace hardcoded LEVELS array

  - Fetch levels from API using React Query
  - Filter to show only active levels
  - Sort by display_order
  - Cache results for performance

  - _Requirements: 3.3_

- [x] 13.3 Replace hardcoded DURATIONS array

  - Fetch durations from API using React Query
  - Filter to show only active durations
  - Sort by display_order
  - Cache results for performance
  - _Requirements: 4.3_

- [x] 13.4 Update tag selection to use enhanced tags


  - Fetch tags with categories and colors
  - Display color-coded tag badges
  - Group tags by category if applicable
  - _Requirements: 5.5_

---

## Phase 5: Testing and Documentation

- [ ] 14. Create backend tests
- [ ] 14.1 Write controller unit tests
  - Test CRUD operations for all entities
  - Test validation logic
  - Test bulk operations
  - Test audit logging
  - _Requirements: All_

- [ ] 14.2 Write API integration tests
  - Test all endpoints with valid data
  - Test error handling and validation
  - Test authentication and authorization
  - Test rate limiting
  - _Requirements: All_

- [ ] 14.3 Write database migration tests
  - Test migration up and down
  - Test data integrity after migration
  - Test index creation
  - _Requirements: 1.1-1.6, 2.1-2.4_

---

- [ ] 15. Create frontend tests
- [ ] 15.1 Write component unit tests
  - Test ConfigEditor form validation
  - Test ConfigTable sorting and filtering
  - Test BulkActionBar interactions
  - Test UsageAnalytics display
  - _Requirements: 7.1-7.5_

- [ ] 15.2 Write integration tests
  - Test API integration with React Query
  - Test form submission and error handling
  - Test bulk operations flow
  - _Requirements: All_

---

- [ ] 16. Create documentation
- [ ] 16.1 Write API documentation
  - Document all endpoints with request/response examples
  - Document validation rules
  - Document error codes and messages
  - Create Postman collection
  - _Requirements: All_

- [ ] 16.2 Write user guide for admins
  - Document how to manage each configuration type
  - Explain bulk operations
  - Explain audit logs
  - Include screenshots
  - _Requirements: All_

- [ ] 16.3 Write developer guide
  - Document database schema
  - Explain migration strategy
  - Document component architecture
  - Explain how to add new configuration types
  - _Requirements: All_

---

## Notes

- Each task should be completed and tested before moving to the next
- All components must match the teacher interface UI/UX (CourseEditor style)
- Ensure proper error handling and validation at every step
- Use existing shared components (DataTable, NotificationSystem, LoadingStates) where possible
- Follow the existing code style and patterns in the project
- Test thoroughly before marking tasks as complete
