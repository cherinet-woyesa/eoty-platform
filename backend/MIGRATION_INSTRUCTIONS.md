# System Configuration Migration Instructions

## Quick Start

To migrate the hardcoded course configuration values to the database, follow these steps:

### 1. Fix Any Failed Migrations (if needed)

If the migration previously failed, run:

```bash
cd backend
node fix-migration.js
```

Or manually:

```bash
npx knex migrate:rollback
npx knex migrate:latest
```

### 2. Run the Migration

```bash
cd backend
npx knex migrate:latest
```

This will:
- Add `estimated_duration`, `prerequisites`, and `learning_objectives` columns to the `courses` table
- Create the `course_categories`, `course_levels`, and `course_durations` tables (if not already created)
- Add `usage_count` columns to track how many courses use each option
- Calculate and populate usage counts from existing course data

### 3. Seed the Configuration Data

```bash
node run-config-seeds.js
```

Or if you want to run all seeds:

```bash
npx knex seed:run
```

This will populate:
- **6 course categories**: Faith & Doctrine, Church History, Spiritual Development, Bible Study, Liturgical Studies, Youth Ministry
- **3 course levels**: Beginner, Intermediate, Advanced
- **4 course durations**: 1-2 weeks, 3-4 weeks, 5-8 weeks, 9+ weeks

### 4. Verify the Data

```bash
node test-system-config-seeds.js
```

This will display:
- All categories with their usage counts
- All levels with their usage counts
- All durations with their usage counts
- Summary statistics

## Expected Output

```
Testing system configuration seeds...

=== Course Categories ===
Found 6 categories:
  - Faith & Doctrine (faith) - Order: 1, Active: true, Usage: X
  - Church History (history) - Order: 2, Active: true, Usage: X
  - Spiritual Development (spiritual) - Order: 3, Active: true, Usage: X
  - Bible Study (bible) - Order: 4, Active: true, Usage: X
  - Liturgical Studies (liturgical) - Order: 5, Active: true, Usage: X
  - Youth Ministry (youth) - Order: 6, Active: true, Usage: X

=== Course Levels ===
Found 3 levels:
  - Beginner (beginner) - No prior knowledge required - Order: 1, Active: true, Usage: X
  - Intermediate (intermediate) - Basic understanding recommended - Order: 2, Active: true, Usage: X
  - Advanced (advanced) - For experienced learners - Order: 3, Active: true, Usage: X

=== Course Durations ===
Found 4 durations:
  - 1-2 weeks (1-2) - Weeks: 1-2 - Order: 1, Active: true, Usage: X
  - 3-4 weeks (3-4) - Weeks: 3-4 - Order: 2, Active: true, Usage: X
  - 5-8 weeks (5-8) - Weeks: 5-8 - Order: 3, Active: true, Usage: X
  - 9+ weeks (9+) - Weeks: 9-∞ - Order: 4, Active: true, Usage: X

=== Usage Count Verification ===
Total courses in database: X
Courses with category: X
Courses with level: X
Courses with duration: X

✅ All tests passed!
```

## Rollback

If you need to rollback the migration:

```bash
npx knex migrate:rollback
```

This will:
- Remove the `usage_count` columns from all configuration tables
- Keep the configuration tables intact (they were created in an earlier migration)

## Files Created

- `backend/seeds/005_course_categories.js` - Category seed data
- `backend/seeds/006_course_levels.js` - Level seed data
- `backend/seeds/007_course_durations.js` - Duration seed data
- `backend/migrations/20251105120100_update_existing_courses_usage.js` - Usage count migration
- `backend/test-system-config-seeds.js` - Verification script

## Troubleshooting

### Error: "column usage_count does not exist" or "column estimated_duration does not exist"

This means the migration didn't complete successfully. Run the fix script:

```bash
node fix-migration.js
```

Or manually:

```bash
npx knex migrate:rollback
npx knex migrate:latest
```

### Error: "relation course_categories does not exist"

The configuration tables haven't been created yet. Run:

```bash
npx knex migrate:latest
```

### Seeds show 0 usage counts

This is normal if you haven't created any courses yet, or if the courses don't have category/level/duration values set.

## Next Steps

After completing this migration:

1. **Phase 3**: Implement backend API endpoints for CRUD operations
2. **Phase 4**: Update the frontend CourseEditor to fetch options from the API
3. **Phase 5**: Build the admin UI for managing these configurations

## Notes

- The migration is safe to run multiple times (idempotent)
- Existing courses are not modified - they already store slug values
- No breaking changes to the current system
- The CourseEditor will continue to work with hardcoded values until Phase 4
