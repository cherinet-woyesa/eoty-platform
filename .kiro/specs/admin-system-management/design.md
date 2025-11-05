# Design Document

## Overview

The Admin System Management feature enhances the existing admin panel by adding comprehensive system configuration capabilities. This allows administrators to manage all selectable options (categories, levels, durations, tags, chapters) that are currently hardcoded in the frontend. The implementation will maintain UI/UX consistency with the teacher interface (CourseEditor style) while integrating seamlessly with the existing admin panel infrastructure.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Panel (Existing)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Dashboard  │  │    Users     │  │   Content    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Uploads    │  │  Moderation  │  │  Analytics   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         System Configuration (NEW)                  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│    │
│  │  │Categories│ │  Levels  │ │Durations │ │  Tags  ││    │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘│    │
│  │  ┌──────────┐ ┌──────────────────────────────────┐│    │
│  │  │ Chapters │ │   Config Dashboard & Audit       ││    │
│  │  └──────────┘ └──────────────────────────────────┘│    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### System Components

1. **Frontend Components**
   - System Configuration Dashboard
   - Configuration Entity Managers (Categories, Levels, Durations, Tags, Chapters)
   - Shared Configuration Editor Component
   - Configuration Table Component
   - Bulk Action Controls

2. **Backend Services**
   - Configuration Controller
   - Configuration Models
   - Validation Middleware
   - Audit Logging Service

3. **Database Layer**
   - Configuration Tables
   - Audit Log Table
   - Migration Scripts

## Components and Interfaces

### Frontend Component Structure

```
frontend/src/
├── pages/admin/
│   └── config/
│       ├── SystemConfigDashboard.tsx      # Overview page
│       ├── CategoryManagement.tsx         # Category CRUD
│       ├── LevelManagement.tsx            # Level CRUD
│       ├── DurationManagement.tsx         # Duration CRUD
│       ├── TagManagement.tsx              # Enhanced tag CRUD
│       └── ChapterManagement.tsx          # Chapter CRUD
├── components/admin/config/
│   ├── ConfigEditor.tsx                   # Reusable editor component
│   ├── ConfigTable.tsx                    # Reusable table component
│   ├── BulkActionBar.tsx                  # Bulk operations UI
│   ├── UsageAnalytics.tsx                 # Usage stats display
│   └── AuditLogViewer.tsx                 # Audit log display
├── types/
│   └── systemConfig.ts                    # TypeScript interfaces
└── services/api/
    └── systemConfig.ts                    # API client methods
```

### Key React Components

#### 1. SystemConfigDashboard

```typescript
interface SystemConfigDashboardProps {}

// Displays overview metrics and quick actions
// - Total counts for each configuration type
// - Inactive items requiring attention
// - Recent configuration changes
// - Quick action buttons
```

#### 2. ConfigEditor (Reusable)

```typescript
interface ConfigEditorProps<T> {
  entityType: 'category' | 'level' | 'duration' | 'tag' | 'chapter';
  entityId?: number;
  initialData?: T;
  onSave: (data: T) => Promise<void>;
  onCancel: () => void;
  validationRules: ValidationRules<T>;
}

// Features:
// - Gradient header matching CourseEditor
// - Form fields with validation
// - Auto-save functionality
// - Loading states
// - Error handling
```

#### 3. ConfigTable (Reusable)

```typescript
interface ConfigTableProps<T> {
  entityType: string;
  data: T[];
  columns: ColumnDefinition<T>[];
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onBulkAction: (action: string, items: T[]) => void;
  isLoading: boolean;
}

// Features:
// - Sortable columns
// - Search and filtering
// - Bulk selection
// - Usage count display
// - Active/inactive status badges
```

## Data Models

### Database Schema

#### 1. course_categories Table

```sql
CREATE TABLE course_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(50),
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_active_order (is_active, display_order),
  INDEX idx_slug (slug)
);
```

#### 2. course_levels Table

```sql
CREATE TABLE course_levels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE,
  slug VARCHAR(30) NOT NULL UNIQUE,
  description VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_active_order (is_active, display_order),
  INDEX idx_slug (slug)
);
```

#### 3. course_durations Table

```sql
CREATE TABLE course_durations (
  id SERIAL PRIMARY KEY,
  value VARCHAR(20) NOT NULL UNIQUE,  -- e.g., "1-2", "3-4"
  label VARCHAR(30) NOT NULL,          -- e.g., "1-2 weeks"
  weeks_min INTEGER,
  weeks_max INTEGER,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_active_order (is_active, display_order)
);
```

#### 4. Enhanced content_tags Table

```sql
-- Enhance existing content_tags table
ALTER TABLE content_tags ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE content_tags ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3B82F6';
ALTER TABLE content_tags ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE content_tags ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tags_category ON content_tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON content_tags(usage_count DESC);
```

#### 5. Enhanced chapters Table

```sql
-- Enhance existing chapters table
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS course_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_chapters_active_order ON chapters(is_active, display_order);
```

#### 6. system_config_audit Table

```sql
CREATE TABLE system_config_audit (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER NOT NULL REFERENCES users(id),
  entity_type VARCHAR(50) NOT NULL,  -- 'category', 'level', 'duration', 'tag', 'chapter'
  entity_id INTEGER NOT NULL,
  action_type VARCHAR(20) NOT NULL,  -- 'create', 'update', 'delete', 'activate', 'deactivate'
  before_state JSONB,
  after_state JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_audit_entity (entity_type, entity_id),
  INDEX idx_audit_admin (admin_id, created_at DESC),
  INDEX idx_audit_created (created_at DESC)
);
```

### TypeScript Interfaces

```typescript
// frontend/src/types/systemConfig.ts

export interface CourseCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  usage_count?: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CourseLevel {
  id: number;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  is_active: boolean;
  usage_count?: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CourseDuration {
  id: number;
  value: string;
  label: string;
  weeks_min?: number;
  weeks_max?: number;
  display_order: number;
  is_active: boolean;
  usage_count?: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface EnhancedTag {
  id: number;
  name: string;
  category?: string;
  color: string;
  display_order: number;
  is_active: boolean;
  usage_count: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface EnhancedChapter {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  course_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface ConfigAuditLog {
  id: number;
  admin_id: number;
  admin_name: string;
  entity_type: string;
  entity_id: number;
  action_type: string;
  before_state?: any;
  after_state?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface SystemConfigMetrics {
  categories: {
    total: number;
    active: number;
    inactive: number;
  };
  levels: {
    total: number;
    active: number;
    inactive: number;
  };
  durations: {
    total: number;
    active: number;
    inactive: number;
  };
  tags: {
    total: number;
    active: number;
    inactive: number;
  };
  chapters: {
    total: number;
    active: number;
    inactive: number;
  };
  recent_changes: ConfigAuditLog[];
}
```

## API Endpoints

### Backend Routes

```javascript
// backend/routes/systemConfig.js

const express = require('express');
const router = express.Router();
const systemConfigController = require('../controllers/systemConfigController');
const { authenticateToken } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// All routes require admin authentication
router.use(authenticateToken, requireAdmin());

// Dashboard
router.get('/metrics', systemConfigController.getMetrics);

// Categories
router.get('/categories', systemConfigController.getCategories);
router.post('/categories', systemConfigController.createCategory);
router.put('/categories/:id', systemConfigController.updateCategory);
router.delete('/categories/:id', systemConfigController.deleteCategory);
router.post('/categories/bulk', systemConfigController.bulkActionCategories);
router.post('/categories/reorder', systemConfigController.reorderCategories);

// Levels
router.get('/levels', systemConfigController.getLevels);
router.post('/levels', systemConfigController.createLevel);
router.put('/levels/:id', systemConfigController.updateLevel);
router.delete('/levels/:id', systemConfigController.deleteLevel);
router.post('/levels/bulk', systemConfigController.bulkActionLevels);
router.post('/levels/reorder', systemConfigController.reorderLevels);

// Durations
router.get('/durations', systemConfigController.getDurations);
router.post('/durations', systemConfigController.createDuration);
router.put('/durations/:id', systemConfigController.updateDuration);
router.delete('/durations/:id', systemConfigController.deleteDuration);
router.post('/durations/bulk', systemConfigController.bulkActionDurations);

// Tags (Enhanced)
router.get('/tags', systemConfigController.getTags);
router.post('/tags', systemConfigController.createTag);
router.put('/tags/:id', systemConfigController.updateTag);
router.delete('/tags/:id', systemConfigController.deleteTag);
router.post('/tags/bulk', systemConfigController.bulkActionTags);
router.post('/tags/merge', systemConfigController.mergeTags);

// Chapters (Enhanced)
router.get('/chapters', systemConfigController.getChapters);
router.post('/chapters', systemConfigController.createChapter);
router.put('/chapters/:id', systemConfigController.updateChapter);
router.delete('/chapters/:id', systemConfigController.deleteChapter);
router.post('/chapters/bulk', systemConfigController.bulkActionChapters);

// Audit Logs
router.get('/audit', systemConfigController.getAuditLogs);

// Usage Analytics
router.get('/:entityType/:id/usage', systemConfigController.getUsageDetails);

module.exports = router;
```

### API Response Formats

```typescript
// Success Response
{
  success: true,
  data: {
    category: CourseCategory,
    // or
    categories: CourseCategory[],
    // or
    metrics: SystemConfigMetrics
  },
  message?: string
}

// Error Response
{
  success: false,
  message: string,
  errors?: ValidationError[]
}

// Bulk Action Response
{
  success: true,
  data: {
    successful: number,
    failed: number,
    errors: Array<{
      id: number,
      error: string
    }>
  }
}
```

## Error Handling

### Validation Rules

1. **Category Validation**
   - Name: 3-50 characters, unique
   - Slug: auto-generated from name, unique
   - Icon: optional, valid Lucide icon name
   - Description: optional, max 500 characters

2. **Level Validation**
   - Name: 3-30 characters, unique
   - Slug: auto-generated from name, unique
   - Description: 10-100 characters
   - At least one level must remain active

3. **Duration Validation**
   - Value: required, unique, format: "\\d+-\\d+" or "\\d+\\+"
   - Label: 5-30 characters
   - weeks_min/max: optional integers

4. **Tag Validation**
   - Name: 2-30 characters, alphanumeric with hyphens, unique
   - Category: optional, max 50 characters
   - Color: valid hex color code

5. **Chapter Validation**
   - Name: 3-100 characters, unique
   - Description: optional, max 500 characters
   - Cannot delete if course_count > 0

### Error Messages

```typescript
export const CONFIG_ERROR_MESSAGES = {
  DUPLICATE_NAME: 'A {entity} with this name already exists',
  INVALID_LENGTH: '{field} must be between {min} and {max} characters',
  REQUIRED_FIELD: '{field} is required',
  CANNOT_DELETE_IN_USE: 'Cannot delete {entity} because it is used by {count} courses',
  CANNOT_DEACTIVATE_LAST: 'Cannot deactivate the last active {entity}',
  INVALID_FORMAT: '{field} format is invalid',
  UNAUTHORIZED: 'You do not have permission to perform this action',
};
```

## Testing Strategy

### Unit Tests

1. **Backend Controller Tests**
   - CRUD operations for each entity type
   - Validation logic
   - Bulk operations
   - Usage count calculations
   - Audit logging

2. **Frontend Component Tests**
   - ConfigEditor form validation
   - ConfigTable sorting and filtering
   - Bulk action UI interactions
   - API integration

### Integration Tests

1. **API Endpoint Tests**
   - Create, read, update, delete flows
   - Bulk operations
   - Error handling
   - Authentication and authorization

2. **Database Tests**
   - Migration scripts
   - Constraint enforcement
   - Index performance
   - Audit log creation

### E2E Tests

1. **Admin Workflows**
   - Create new category and use in course
   - Deactivate unused duration option
   - Merge duplicate tags
   - Bulk activate/deactivate items
   - View audit logs

## UI/UX Design Patterns

### Design System Alignment

All components will match the teacher interface (CourseEditor) design:

1. **Headers**
   - Gradient background: `from-blue-600 to-purple-700`
   - White text with icon
   - Description text in `text-blue-100`

2. **Cards**
   - White background: `bg-white`
   - Rounded corners: `rounded-lg`
   - Border: `border border-gray-200`
   - Shadow: `shadow-sm`

3. **Form Inputs**
   - Border: `border-gray-300`
   - Focus ring: `focus:ring-2 focus:ring-blue-500`
   - Padding: `px-4 py-3`
   - Error state: `border-red-500`

4. **Buttons**
   - Primary: `bg-gradient-to-r from-blue-600 to-purple-600`
   - Secondary: `border border-gray-300 text-gray-700`
   - Loading state with spinner

5. **Notifications**
   - Use existing NotificationSystem
   - Success: green
   - Error: red
   - Warning: yellow
   - Info: blue

### Responsive Design

- Desktop: Full layout with sidebar
- Tablet: Collapsible sidebar
- Mobile: Bottom navigation (if needed)
- Minimum width: 1024px for admin panel

## Performance Considerations

1. **Caching Strategy**
   - Cache active configuration options in Redis
   - Invalidate cache on updates
   - TTL: 1 hour for configuration data

2. **Database Optimization**
   - Indexes on frequently queried columns
   - Usage count denormalization
   - Batch updates for bulk operations

3. **Frontend Optimization**
   - React Query for data fetching and caching
   - Debounced search inputs
   - Virtualized tables for large datasets
   - Lazy loading for audit logs

4. **API Optimization**
   - Pagination for list endpoints
   - Field selection for reduced payload
   - Batch endpoints for bulk operations

## Security Considerations

1. **Authentication & Authorization**
   - All endpoints require admin authentication
   - Role-based access control (RBAC)
   - Chapter admins limited to their chapter

2. **Input Validation**
   - Server-side validation for all inputs
   - SQL injection prevention (parameterized queries)
   - XSS prevention (sanitize inputs)

3. **Audit Logging**
   - Log all configuration changes
   - Include IP address and user agent
   - Retain logs for 365 days minimum

4. **Rate Limiting**
   - Apply rate limits to prevent abuse
   - Stricter limits for bulk operations

## Migration Strategy

### Phase 1: Database Setup
1. Create new configuration tables
2. Enhance existing tables (tags, chapters)
3. Create audit log table
4. Add indexes

### Phase 2: Data Migration
1. Migrate hardcoded categories to database
2. Migrate hardcoded levels to database
3. Migrate hardcoded durations to database
4. Update existing courses to reference new tables

### Phase 3: Backend Implementation
1. Create controllers and routes
2. Implement validation middleware
3. Add audit logging
4. Create API tests

### Phase 4: Frontend Implementation
1. Create configuration components
2. Update admin sidebar navigation
3. Integrate with existing admin panel
4. Update CourseEditor to use dynamic options

### Phase 5: Testing & Deployment
1. Run integration tests
2. Perform UAT with admins
3. Deploy to staging
4. Monitor and fix issues
5. Deploy to production

## Rollback Plan

If issues arise:
1. Revert frontend to use hardcoded values
2. Keep database tables for future retry
3. Disable system configuration routes
4. Investigate and fix issues
5. Re-deploy when ready

## Future Enhancements

1. **Import/Export Configuration**
   - Export configuration as JSON
   - Import configuration from file
   - Useful for environment sync

2. **Configuration Templates**
   - Pre-defined configuration sets
   - Quick setup for new chapters

3. **Advanced Analytics**
   - Trend analysis for option usage
   - Recommendations for cleanup

4. **Multi-language Support**
   - Translate configuration options
   - Support for multiple locales

5. **Configuration Versioning**
   - Track configuration history
   - Rollback to previous versions
