import { apiClient } from './index';
import type { 
  Resource, 
  UserNote, 
  AISummary, 
  ResourceFilters, 
  ResourceResponse, 
  FilterOptions,
  CreateNoteRequest 
} from '@/types/resources';

export const resourcesApi = {
  // Get resources with filtering
  getResources: async (filters: ResourceFilters = {}): Promise<ResourceResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`/resources?${params}`);
    return response.data;
  },

  // Enhanced search with all filters (REQUIREMENT: Tag, type, topic, author, date)
  searchResources: async (filters: ResourceFilters = {}): Promise<ResourceResponse> => {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`/resources/search?${params}`);
    return response.data;
  },

  // Get resources by scope
  getChapterResources: async (chapterId: string, filters: ResourceFilters = {}): Promise<ResourceResponse> => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`/resources/chapter/${chapterId}?${params}`);
    return response.data;
  },

  getPlatformResources: async (filters: ResourceFilters = {}): Promise<ResourceResponse> => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`/resources/platform?${params}`);
    return response.data;
  },

  getCourseResources: async (courseId: string, filters: ResourceFilters = {}): Promise<ResourceResponse> => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          params.append(key, value.join(','));
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await apiClient.get(`/resources/course/${courseId}?${params}`);
    return response.data;
  },

  // Get single resource with inline viewing capability (REQUIREMENT: Inline viewing)
  getResource: async (id: number): Promise<{ success: boolean; data: { resource: Resource; canViewInline: boolean; isUnsupported: boolean; errorMessage?: string } }> => {
    const response = await apiClient.get(`/resources/${id}`);
    return response.data;
  },

  // Get filter options
  getFilters: async (): Promise<{ success: boolean; data: FilterOptions }> => {
    const response = await apiClient.get('/resources/filters');
    return response.data;
  },

  // Create note with section anchoring (REQUIREMENT: Anchor notes to sections)
  createNote: async (noteData: CreateNoteRequest): Promise<{ success: boolean; data: { note: UserNote } }> => {
    const response = await apiClient.post(`/resources/${noteData.resourceId}/notes`, noteData);
    return response.data;
  },

  // Get resource notes
  getNotes: async (resourceId: number): Promise<{ success: boolean; data: { user_notes: UserNote[]; public_notes: UserNote[] } }> => {
    const response = await apiClient.get(`/resources/${resourceId}/notes`);
    return response.data;
  },

  // Get AI summary (REQUIREMENT: < 250 words, 98% relevance)
  getSummary: async (resourceId: number, type: string = 'brief'): Promise<{ success: boolean; data: { summary: AISummary; meetsWordLimit: boolean; meetsRelevanceRequirement: boolean } }> => {
    const response = await apiClient.get(`/resources/${resourceId}/summary?type=${type}`);
    return response.data;
  },

  // Explain a specific section / selected text using AI
  explainSection: async (resourceId: number, text: string, type: string = 'brief'): Promise<{ success: boolean; data: { summary: AISummary } }> => {
    const response = await apiClient.post(`/resources/${resourceId}/explain`, { text, type });
    return response.data;
  },

  // Export content (REQUIREMENT: Export notes/summaries)
  exportContent: async (resourceId: number, type: string = 'combined', format: string = 'pdf'): Promise<any> => {
    const response = await apiClient.get(`/resources/${resourceId}/export?type=${type}&format=${format}`);
    return response.data;
  },

  // Share resource with chapter (REQUIREMENT: Share with chapter members)
  shareResource: async (resourceId: number, shareType: string = 'view', message?: string): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await apiClient.post(`/resources/${resourceId}/share`, { shareType, message });
    return response.data;
  },

  // Request access to a resource (dedicated endpoint if available)
  requestAccess: async (resourceId: number, message: string): Promise<{ success: boolean; message?: string; data?: any }> => {
    try {
      // Preferred dedicated endpoint
      const response = await apiClient.post(`/resources/${resourceId}/request-access`, { message });
      return response.data;
    } catch (err: any) {
      // Fallback: attempt to use shareResource with a 'request_access' type
      try {
        const fallback = await apiClient.post(`/resources/${resourceId}/share`, { shareType: 'request_access', message });
        return fallback.data;
      } catch (err2: any) {
        throw err2;
      }
    }
  },

  // Share note with chapter (REQUIREMENT: Share notes with chapter members)
  shareNote: async (noteId: number): Promise<{ success: boolean; message: string; data: any }> => {
    const response = await apiClient.post(`/resources/notes/${noteId}/share`, {});
    return response.data;
  },

  // Update resource
  updateResource: async (id: number, data: Partial<Resource>): Promise<{ success: boolean; data: Resource }> => {
    const response = await apiClient.put(`/resources/${id}`, data);
    return response.data;
  },

  // Delete resource
  deleteResource: async (id: number): Promise<{ success: boolean }> => {
    const response = await apiClient.delete(`/resources/${id}`);
    return response.data;
  }
};