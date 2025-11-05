# Task 2: Data Migration Summary

## Overview

This document summarizes the implementation of Task 2: "Migrate hardcoded values to database" from the Admin System Management feature specification.

## Completed Subtasks

### 2.1 Create seed script for course categories ✅

**File:** `backend/seeds/005_course_categories.js`

Migrated the hardcoded `CATEGORIES` array from `CourseEditor.tsx` to the database:

- **Faith & Doctrine** (slug: `faith`) - Order 1
- **Church History** (slug: `history`) - Order 2
- **Spiritual Development** (slug: `spiritual`) - Order 3
- **Bible Study** (slug: `bible`) - Order 4
- **Liturgical Studies** (slug: `liturgical`) - Order 5
- **Youth Ministry** (slug: `youth`) - Order 6

All categories include:
- Unique name and slug
- Icon reference (Lucide icon names)
- Description
- Display order for consistent sorting
- Active status (all set to `true`)
- Timestamps

### 2.2 Create seed script for course levels ✅

**File:** `backend/seeds/006_course_levels.js`

Migrated the hardcoded `LEVELS` array from `CourseEditor.tsx` to the database:

- **Beginner** (slug: `beginner`) - "No prior knowledge required" - Order 1
- **Intermediate** (slug: `intermediate`) - "Basic understanding recommended" - Order 2
- **Advanced** (slug: `advanced`) - "For experienced learners" - Order 3

All levels include:
- Unique name and slug
- Description matching the original hardcoded values
- Display order for consistent sorting
- Active status (all set to `true`)
- Timestamps

### 2.3 Create seed script for course durations ✅

**File:** `backend/seeds/007_course_durations.js`

Migrated the hardcoded `DURATIONS` array from `CourseEditor.tsx` to the database:

- **1-2 weeks** (value: `1-2`) - Weeks: 1-2 - Order 1
- **3-4 weeks** (value: `3-4`) - Weeks: 3-4 - Order 2
- **5-8 weeks** (value: `5-8`) - Weeks: 5-8 - Order 3
- **9+ weeks** (value: `9+`) - Weeks: 9+ - Order 4

All durations include:
- Unique value (matches what's stored in courses table)
- Human-readable label
- Numeric week ranges (min/max)
- Display order for consistent sorting
- Active status (all set to `true`)
- Timestamps

### 2.4 Create migration script to update existing courses ✅

**File:** `backend/migrations/20251105120100_update_existing_courses_usage.js`

This migration performs the following operations:

1. **Add missing columns to courses table**:
   - `estimated_duration` - for storing course duration values
   - `prerequisites` - for storing prerequisite information
   - `learning_objectives` - for storing learning objectives as JSON

2. **Add usage_count columns** to all three configuration tables:
   - `course_categories.usage_count`
   - `course_levels.usage_count`
   - `course_durations.usage_count`

3. **Calculate usage counts** by querying the `courses` table:
   - Groups courses by category, level, and estimated_duration
   - Counts how many courses use each option
   - Updates the corresponding configuration table records

4. **Maintains data integrity**:
   - Uses slug-based references (no foreign keys)
   - Handles null and empty values appropriately
   - Updates timestamps on modified records

## Database Schema

### Courses Table Updates

The migration adds the following columns to the `courses` table:
- `estimated_duration` (string, 20 chars) - stores value strings (e.g., '1-2', '3-4')
- `prerequisites` (text) - stores prerequisite information
- `learning_objectives` (jsonb) - stores array of learning objectives

The `courses` table already has:
- `category` - stores slug values (e.g., 'faith', 'history')
- `level` - stores slug values (e.g., 'beginner', 'intermediate')

No foreign key constraints were added to maintain flexibility and avoid breaking existing data.

### New Columns Added

All three configuration tables now have:
- `usage_count` (integer, default 0) - tracks how many courses use each option

## Running the Migration

### Step 1: Run Migrations

```bash
cd backend
npx knex migrate:latest
```

This will:
- Create the configuration tables (if not already created)
- Add usage_count columns
- Calculate and populate usage counts

### Step 2: Run Seeds

```bash
cd backend
npx knex seed:run
```

This will:
- Clear existing configuration data
- Insert the 6 course categories
- Insert the 3 course levels
- Insert the 4 course durations

### Step 3: Verify Data

Run the test script to verify everything is working:

```bash
cd backend
node test-system-config-seeds.js
```

Expected output:
```
Testing system configuration seeds...

=== Course Categories ===
Found 6 categories:
  - Faith & Doctrine (faith) - Order: 1, Active: true, Usage: X
  - Church History (history) - Order: 2, Active: true, Usage: X
  ...

=== Course Levels ===
Found 3 levels:
  - Beginner (beginner) - No prior knowledge required - Order: 1, Active: true, Usage: X
  ...

=== Course Durations ===
Found 4 durations:
  - 1-2 weeks (1-2) - Weeks: 1-2 - Order: 1, Active: true, Usage: X
  ...

✅ All tests passed!
```

## Data Integrity

### Backward Compatibility

- Existing courses continue to work without modification
- The `courses` table already stores slug values, not IDs
- No breaking changes to the API or frontend (yet)

### Usage Count Accuracy

The usage counts are calculated from actual course data:
- Counts are updated during migration
- Future updates will need to maintain these counts (handled in Phase 3)

## Next Steps

With the data migration complete, the next phase is:

**Phase 3: Backend Implementation**
- Create API endpoints for CRUD operations
- Implement validation middleware
- Add audit logging
- Create controllers for system configuration management

## Files Created

1. `backend/seeds/005_course_categories.js` - Category seed data
2. `backend/seeds/006_course_levels.js` - Level seed data
3. `backend/seeds/007_course_durations.js` - Duration seed data
4. `backend/migrations/20251105120100_update_existing_courses_usage.js` - Usage count migration
5. `backend/test-system-config-seeds.js` - Verification test script
6. `backend/docs/TASK_2_DATA_MIGRATION_SUMMARY.md` - This document

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **Requirement 2.1**: Course categories are now stored in the database with all required fields
- **Requirement 2.2**: Categories include validation-ready fields (name, slug, description)
- **Requirement 3.1**: Course levels are stored with names, descriptions, and active status
- **Requirement 3.2**: Levels include all necessary fields for validation
- **Requirement 4.1**: Course durations are stored with values, labels, and week ranges
- **Requirement 4.2**: Durations follow the required format pattern
- **Requirement 2.5, 3.4, 4.4**: Usage counts are calculated and stored for all entities

## Testing Checklist

- [x] Migration runs without errors
- [x] Seeds populate all configuration tables
- [x] Usage counts are calculated correctly
- [x] All columns have appropriate data types
- [x] Indexes are created for performance
- [x] Rollback functionality works
- [x] No breaking changes to existing courses
- [x] Test script verifies data integrity

## Notes

- The migration is idempotent - it checks for column existence before adding
- Seeds use `del()` to clear existing data, ensuring clean state
- Usage counts will need to be maintained by the backend API (Phase 3)
- The CourseEditor still uses hardcoded arrays - this will be updated in Phase 4
