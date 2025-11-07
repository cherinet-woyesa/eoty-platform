import { apiClient } from './apiClient';

export interface SubtitleTrack {
  id: string;
  lesson_id: string;
  language: string;
  language_code: string;
  file_url: string;
  file_size: number;
  created_at: string;
  updated_at: string;
}

export interface SubtitleUploadData {
  language: string;
  languageCode: string;
  file: File;
}

export const subtitlesApi = {
  /**
   * Get all subtitles for a lesson
   */
  getSubtitles: async (lessonId: string) => {
    const response = await apiClient.get(`/courses/lessons/${lessonId}/subtitles`);
    return response.data;
  },

  /**
   * Upload a subtitle file for a lesson (instructor only)
   */
  uploadSubtitle: async (lessonId: string, data: SubtitleUploadData) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('language', data.language);
    formData.append('languageCode', data.languageCode);

    const response = await apiClient.post(
      `/courses/lessons/${lessonId}/subtitles`,
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
   * Delete a subtitle (instructor only)
   */
  deleteSubtitle: async (lessonId: string, subtitleId: string) => {
    const response = await apiClient.delete(
      `/courses/lessons/${lessonId}/subtitles/${subtitleId}`
    );
    return response.data;
  },
};
