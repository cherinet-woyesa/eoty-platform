import { apiClient } from './apiClient';

export interface LessonResource {
  id: string;
  lesson_id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  file_url: string;
  description: string | null;
  download_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceUploadData {
  file: File;
  description?: string;
}

export const lessonResourcesApi = {
  /**
   * Get all resources for a lesson
   */
  getResources: async (lessonId: string) => {
    const response = await apiClient.get(`/courses/lessons/${lessonId}/resources`);
    return response.data;
  },

  /**
   * Upload a resource file for a lesson (instructor only)
   */
  uploadResource: async (lessonId: string, data: ResourceUploadData) => {
    const formData = new FormData();
    formData.append('file', data.file);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await apiClient.post(
      `/courses/lessons/${lessonId}/resources`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * Get download URL for a resource
   */
  downloadResource: async (lessonId: string, resourceId: string) => {
    const response = await apiClient.get(
      `/courses/lessons/${lessonId}/resources/${resourceId}/download`
    );
    return response.data;
  },

  /**
   * Delete a resource (instructor only)
   */
  deleteResource: async (lessonId: string, resourceId: string) => {
    const response = await apiClient.delete(
      `/courses/lessons/${lessonId}/resources/${resourceId}`
    );
    return response.data;
  },
};
