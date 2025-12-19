# Database Migrations - Instructions

## Overview
This directory contains SQL migration files to update the database schema.

## Migrations to Run

### 1. Forum Reports Moderation (CRITICAL)
**File:** `add_forum_reports_moderation_columns.sql`

**What it does:**
- Adds `moderated_by` column (references users table)
- Adds `moderated_at` column (timestamp)
- Adds `moderation_notes` column (text)
- Creates indexes for performance
- Adds documentation comments

**Run this to fix:** Forum moderation errors

---

### 2. Content Tags Color (CRITICAL)
**File:** `add_content_tags_color_column.sql`

**What it does:**
- Adds `color` column (VARCHAR(7) for hex colors)
- Sets default color to #3B82F6 (blue)
- Adds validation constraint for hex format
- Adds documentation comment

**Run this to fix:** Tag creation errors

---

## How to Run Migrations

### Option 1: Using psql (PostgreSQL CLI)
```bash
# Navigate to migrations directory
cd backend/migrations

# Run forum_reports migration
psql -U your_username -d your_database -f add_forum_reports_moderation_columns.sql

# Run content_tags migration
psql -U your_username -d your_database -f add_content_tags_color_column.sql
```

### Option 2: Using pgAdmin or Database GUI
1. Open your database management tool
2. Connect to your database
3. Open the SQL query tool
4. Copy and paste the contents of each migration file
5. Execute the queries

### Option 3: Using Node.js Migration Tool (if you have one)
```bash
npm run migrate
# or
yarn migrate
```

---

## Verification

After running migrations, verify they worked:

```sql
-- Verify forum_reports columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'forum_reports' 
AND column_name IN ('moderated_by', 'moderated_at', 'moderation_notes');

-- Verify content_tags color column
SELECT column_name, data_type, column_default
FROM information_schema.columns 
WHERE table_name = 'content_tags' 
AND column_name = 'color';
```

Expected results:
- forum_reports should show 3 new columns
- content_tags should show color column with default '#3B82F6'

---

## Rollback (if needed)

If you need to undo these migrations:

```sql
-- Rollback forum_reports
ALTER TABLE forum_reports 
DROP COLUMN IF EXISTS moderated_by,
DROP COLUMN IF EXISTS moderated_at,
DROP COLUMN IF EXISTS moderation_notes;

-- Rollback content_tags
ALTER TABLE content_tags 
DROP COLUMN IF EXISTS color;
```

---

## Important Notes

1. **Backup First:** Always backup your database before running migrations
2. **Test Environment:** Run on test/staging environment first
3. **Production:** Schedule during low-traffic period
4. **Existing Data:** These migrations are safe - they only ADD columns
5. **No Data Loss:** Existing data will not be affected

---

## Status After Migration

Once migrations are complete:
- ✅ Forum moderation will work (approve/reject/hide reports)
- ✅ Tag creation with colors will work
- ✅ No more database errors in console
