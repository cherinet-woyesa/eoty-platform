/**
 * System Configuration Type Definitions
 * 
 * TypeScript interfaces for system configuration entities.
 * These match the backend models and API responses.
 */

// ============================================================================
// Core Entity Types
// ============================================================================

export interface CourseCategory {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CourseLevel {
  id: number;
  name: string;
  slug: string;
  description: string;
  display_order: number;
  is_active: boolean;
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CourseDuration {
  id: number;
  value: string;
  label: string;
  weeks_min?: number;
  weeks_max?: number;
  display_order: number;
  is_active: boolean;
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ContentTag {
  id: number;
  name: string;
  category?: string;
  color: string;
  display_order: number;
  is_active: boolean;
  usage_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
  course_count: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Audit & Analytics Types
// ============================================================================

export interface ConfigAuditLog {
  id: number;
  admin_id: number;
  admin_name: string;
  admin_email: string;
  entity_type: 'category' | 'level' | 'duration' | 'tag' | 'chapter';
  entity_id: number;
  action_type: 'create' | 'update' | 'delete' | 'activate' | 'deactivate' | 'reorder';
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface EntityMetrics {
  total: number;
  active: number;
  inactive: number;
}

export interface SystemConfigMetrics {
  categories: EntityMetrics;
  levels: EntityMetrics;
  durations: EntityMetrics;
  tags: EntityMetrics;
  chapters: EntityMetrics;
  recent_changes: ConfigAuditLog[];
}

export interface UsageDetails {
  entity_id: number;
  entity_type: string;
  usage_count: number;
  courses: Array<{
    id: number;
    title: string;
    is_published: boolean;
  }>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface BulkActionRequest {
  action: 'activate' | 'deactivate' | 'delete';
  ids: number[];
}

export interface BulkActionResult {
  successful: number;
  failed: number;
  errors: Array<{
    id: number;
    error: string;
  }>;
}

export interface ReorderRequest {
  items: Array<{
    id: number;
    display_order: number;
  }>;
}

export interface MergeTagsRequest {
  source_tag_id: number;
  target_tag_id: number;
}

export interface AuditLogFilters {
  start_date?: string;
  end_date?: string;
  admin_id?: number;
  entity_type?: string;
  entity_id?: number;
  action_type?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogResponse {
  logs: ConfigAuditLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ============================================================================
// Form Data Types
// ============================================================================

export interface CategoryFormData {
  name: string;
  icon?: string;
  description?: string;
}

export interface LevelFormData {
  name: string;
  description: string;
}

export interface DurationFormData {
  value: string;
  label: string;
  weeks_min?: number;
  weeks_max?: number;
}

export interface TagFormData {
  name: string;
  category?: string;
  color?: string;
}

export interface ChapterFormData {
  name: string;
  description?: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface ConfigTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface ConfigTableSort {
  column: string;
  direction: 'asc' | 'desc';
}

export interface ConfigTableFilters {
  search?: string;
  active_only?: boolean;
  sort_by?: string;
}

export interface SelectedItems {
  [key: number]: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string>;
}

export interface CategoriesResponse {
  categories: CourseCategory[];
}

export interface LevelsResponse {
  levels: CourseLevel[];
}

export interface DurationsResponse {
  durations: CourseDuration[];
}

export interface TagsResponse {
  tags: ContentTag[];
}

export interface ChaptersResponse {
  chapters: Chapter[];
}

// ============================================================================
// Union Types
// ============================================================================

export type ConfigEntity = CourseCategory | CourseLevel | CourseDuration | ContentTag | Chapter;

export type EntityType = 'category' | 'level' | 'duration' | 'tag' | 'chapter';

export type FormData = CategoryFormData | LevelFormData | DurationFormData | TagFormData | ChapterFormData;
