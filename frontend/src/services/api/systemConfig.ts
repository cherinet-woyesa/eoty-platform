import { apiClient } from './apiClient';
import type {
  CourseCategory,
  CourseLevel,
  CourseDuration,
  ContentTag,
  Chapter,
  SystemConfigMetrics,
  BulkActionRequest,
  BulkActionResult,
  ReorderRequest,
  MergeTagsRequest,
  UsageDetails,
  AuditLogFilters,
  AuditLogResponse,
  CategoryFormData,
  LevelFormData,
  DurationFormData,
  TagFormData,
  ChapterFormData,
  ApiResponse,
  CategoriesResponse,
  LevelsResponse,
  DurationsResponse,
  TagsResponse,
  ChaptersResponse
} from '@/types/systemConfig';

const BASE_URL = '/system-config';

/**
 * System Configuration API Client
 * 
 * Provides methods for all CRUD operations on system configuration entities.
 */

// ============================================================================
// Dashboard & Metrics
// ============================================================================

export const getMetrics = async (): Promise<SystemConfigMetrics> => {
  const response = await apiClient.get<ApiResponse<SystemConfigMetrics>>(`${BASE_URL}/metrics`);
  return response.data.data!;
};

// ============================================================================
// Categories
// ============================================================================

export const getCategories = async (activeOnly = false): Promise<CourseCategory[]> => {
  const response = await apiClient.get<ApiResponse<CategoriesResponse>>(
    `${BASE_URL}/categories`,
    { params: { active_only: activeOnly } }
  );
  return response.data.data!.categories;
};

export const createCategory = async (data: CategoryFormData): Promise<CourseCategory> => {
  const response = await apiClient.post<ApiResponse<{ category: CourseCategory }>>(
    `${BASE_URL}/categories`,
    data
  );
  return response.data.data!.category;
};

export const updateCategory = async (id: number, data: Partial<CategoryFormData> & { is_active?: boolean }): Promise<CourseCategory> => {
  const response = await apiClient.put<ApiResponse<{ category: CourseCategory }>>(
    `${BASE_URL}/categories/${id}`,
    data
  );
  return response.data.data!.category;
};

export const deleteCategory = async (id: number): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/categories/${id}`);
};

export const bulkActionCategories = async (request: BulkActionRequest): Promise<BulkActionResult> => {
  const response = await apiClient.post<ApiResponse<BulkActionResult>>(
    `${BASE_URL}/categories/bulk`,
    request
  );
  return response.data.data!;
};

export const reorderCategories = async (request: ReorderRequest): Promise<void> => {
  await apiClient.post(`${BASE_URL}/categories/reorder`, request);
};

// ============================================================================
// Levels
// ============================================================================

export const getLevels = async (activeOnly = false): Promise<CourseLevel[]> => {
  const response = await apiClient.get<ApiResponse<LevelsResponse>>(
    `${BASE_URL}/levels`,
    { params: { active_only: activeOnly } }
  );
  return response.data.data!.levels;
};

export const createLevel = async (data: LevelFormData): Promise<CourseLevel> => {
  const response = await apiClient.post<ApiResponse<{ level: CourseLevel }>>(
    `${BASE_URL}/levels`,
    data
  );
  return response.data.data!.level;
};

export const updateLevel = async (id: number, data: Partial<LevelFormData> & { is_active?: boolean }): Promise<CourseLevel> => {
  const response = await apiClient.put<ApiResponse<{ level: CourseLevel }>>(
    `${BASE_URL}/levels/${id}`,
    data
  );
  return response.data.data!.level;
};

export const deleteLevel = async (id: number): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/levels/${id}`);
};

export const bulkActionLevels = async (request: BulkActionRequest): Promise<BulkActionResult> => {
  const response = await apiClient.post<ApiResponse<BulkActionResult>>(
    `${BASE_URL}/levels/bulk`,
    request
  );
  return response.data.data!;
};

export const reorderLevels = async (request: ReorderRequest): Promise<void> => {
  await apiClient.post(`${BASE_URL}/levels/reorder`, request);
};

// ============================================================================
// Durations
// ============================================================================

export const getDurations = async (activeOnly = false): Promise<CourseDuration[]> => {
  const response = await apiClient.get<ApiResponse<DurationsResponse>>(
    `${BASE_URL}/durations`,
    { params: { active_only: activeOnly } }
  );
  return response.data.data!.durations;
};

export const createDuration = async (data: DurationFormData): Promise<CourseDuration> => {
  const response = await apiClient.post<ApiResponse<{ duration: CourseDuration }>>(
    `${BASE_URL}/durations`,
    data
  );
  return response.data.data!.duration;
};

export const updateDuration = async (id: number, data: Partial<DurationFormData> & { is_active?: boolean }): Promise<CourseDuration> => {
  const response = await apiClient.put<ApiResponse<{ duration: CourseDuration }>>(
    `${BASE_URL}/durations/${id}`,
    data
  );
  return response.data.data!.duration;
};

export const deleteDuration = async (id: number): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/durations/${id}`);
};

export const bulkActionDurations = async (request: BulkActionRequest): Promise<BulkActionResult> => {
  const response = await apiClient.post<ApiResponse<BulkActionResult>>(
    `${BASE_URL}/durations/bulk`,
    request
  );
  return response.data.data!;
};

// ============================================================================
// Tags
// ============================================================================

export const getTags = async (activeOnly = false, sortBy?: string): Promise<ContentTag[]> => {
  const response = await apiClient.get<ApiResponse<TagsResponse>>(
    `${BASE_URL}/tags`,
    { params: { active_only: activeOnly, sort_by: sortBy } }
  );
  return response.data.data!.tags;
};

export const createTag = async (data: TagFormData): Promise<ContentTag> => {
  const response = await apiClient.post<ApiResponse<{ tag: ContentTag }>>(
    `${BASE_URL}/tags`,
    data
  );
  return response.data.data!.tag;
};

export const updateTag = async (id: number, data: Partial<TagFormData> & { is_active?: boolean }): Promise<ContentTag> => {
  const response = await apiClient.put<ApiResponse<{ tag: ContentTag }>>(
    `${BASE_URL}/tags/${id}`,
    data
  );
  return response.data.data!.tag;
};

export const deleteTag = async (id: number): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/tags/${id}`);
};

export const bulkActionTags = async (request: BulkActionRequest): Promise<BulkActionResult> => {
  const response = await apiClient.post<ApiResponse<BulkActionResult>>(
    `${BASE_URL}/tags/bulk`,
    request
  );
  return response.data.data!;
};

export const mergeTags = async (request: MergeTagsRequest): Promise<void> => {
  await apiClient.post(`${BASE_URL}/tags/merge`, request);
};

// ============================================================================
// Chapters
// ============================================================================

export const getChapters = async (activeOnly = false): Promise<Chapter[]> => {
  const response = await apiClient.get<ApiResponse<ChaptersResponse>>(
    `${BASE_URL}/chapters`,
    { params: { active_only: activeOnly } }
  );
  return response.data.data!.chapters;
};

export const createChapter = async (data: ChapterFormData): Promise<Chapter> => {
  const response = await apiClient.post<ApiResponse<{ chapter: Chapter }>>(
    `${BASE_URL}/chapters`,
    data
  );
  return response.data.data!.chapter;
};

export const updateChapter = async (id: number, data: Partial<ChapterFormData> & { is_active?: boolean }): Promise<Chapter> => {
  const response = await apiClient.put<ApiResponse<{ chapter: Chapter }>>(
    `${BASE_URL}/chapters/${id}`,
    data
  );
  return response.data.data!.chapter;
};

export const deleteChapter = async (id: number): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/chapters/${id}`);
};

export const bulkActionChapters = async (request: BulkActionRequest): Promise<BulkActionResult> => {
  const response = await apiClient.post<ApiResponse<BulkActionResult>>(
    `${BASE_URL}/chapters/bulk`,
    request
  );
  return response.data.data!;
};

export const geocodePreview = async (data: {
  address?: string;
  city?: string;
  region?: string;
  country?: string;
}): Promise<{ latitude?: number; longitude?: number; location?: string }> => {
  const response = await apiClient.post<ApiResponse<{ latitude?: number; longitude?: number; location?: string }>>(
    `${BASE_URL}/chapters/geocode-preview`,
    data
  );
  return response.data.data!;
};

// ============================================================================
// Audit Logs
// ============================================================================

export const getAuditLogs = async (filters: AuditLogFilters = {}): Promise<AuditLogResponse> => {
  const response = await apiClient.get<ApiResponse<AuditLogResponse>>(
    `${BASE_URL}/audit`,
    { params: filters }
  );
  return response.data.data!;
};

// ============================================================================
// Usage Analytics
// ============================================================================

export const getUsageDetails = async (entityType: string, id: number): Promise<UsageDetails> => {
  const response = await apiClient.get<ApiResponse<UsageDetails>>(
    `${BASE_URL}/${entityType}/${id}/usage`
  );
  return response.data.data!;
};

// ============================================================================
// Languages
// ============================================================================

export const getLanguages = async (activeOnly = false): Promise<Language[]> => {
  const response = await apiClient.get<ApiResponse<LanguagesResponse>>(
    `${BASE_URL}/languages`,
    { params: { active_only: activeOnly } }
  );
  return response.data.data!.languages;
};

// ============================================================================
// Export as default object
// ============================================================================

export const systemConfigApi = {
  // Dashboard
  getMetrics,
  
  // Categories
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkActionCategories,
  reorderCategories,
  
  // Levels
  getLevels,
  createLevel,
  updateLevel,
  deleteLevel,
  bulkActionLevels,
  reorderLevels,
  
  // Durations
  getDurations,
  createDuration,
  updateDuration,
  deleteDuration,
  bulkActionDurations,
  
  // Tags
  getTags,
  createTag,
  updateTag,
  deleteTag,
  bulkActionTags,
  mergeTags,
  
  // Chapters
  getChapters,
  createChapter,
  updateChapter,
  deleteChapter,
  bulkActionChapters,
  geocodePreview,
  
  // Audit & Analytics
  getAuditLogs,
  getUsageDetails,

  // Languages
  getLanguages
};

export default systemConfigApi;
