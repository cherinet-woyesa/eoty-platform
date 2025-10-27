import { apiClient } from '../index';
import { 
  Resource, 
  UserNote, 
  AISummary, 
  ResourceFilters, 
  ResourceResponse, 
  FilterOptions,
  CreateNoteRequest 
} from '../../../types/resources';

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

  // Get single resource
  getResource: async (id: number): Promise<{ success: boolean; data: { resource: Resource } }> => {
    const response = await apiClient.get(`/resources/${id}`);
    return response.data;
  },

  // Get filter options
  getFilters: async (): Promise<{ success: boolean; data: FilterOptions }> => {
    const response = await apiClient.get('/resources/filters');
    return response.data;
  },

  // Create note
  createNote: async (noteData: CreateNoteRequest): Promise<{ success: boolean; data: { note: UserNote } }> => {
    const response = await apiClient.post('/resources/notes', noteData);
    return response.data;
  },

  // Get resource notes
  getNotes: async (resourceId: number): Promise<{ success: boolean; data: { user_notes: UserNote[]; public_notes: UserNote[] } }> => {
    const response = await apiClient.get(`/resources/${resourceId}/notes`);
    return response.data;
  },

  // Get AI summary
  getSummary: async (resourceId: number, type: string = 'brief'): Promise<{ success: boolean; data: { summary: AISummary } }> => {
    const response = await apiClient.get(`/resources/${resourceId}/summary?type=${type}`);
    return response.data;
  },

  // Export content
  exportContent: async (resourceId: number, format: string = 'pdf'): Promise<any> => {
    const response = await apiClient.get(`/resources/${resourceId}/export?format=${format}`);
    return response.data;
  }
};