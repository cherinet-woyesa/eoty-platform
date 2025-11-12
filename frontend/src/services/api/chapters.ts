import { apiClient } from './index';
import type { Chapter } from '@/types/community';

export const chaptersApi = {
  // Get all active chapters
  getAllChapters: async (): Promise<{ success: boolean; data: { chapters: Chapter[] } }> => {
    const response = await apiClient.get('/chapters');
    return response.data;
  },

  // Get chapter by ID
  getChapterById: async (id: number): Promise<{ success: boolean; data: { chapter: Chapter } }> => {
    const response = await apiClient.get(`/chapters/${id}`);
    return response.data;
  }
};