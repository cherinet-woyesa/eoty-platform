import { apiClient } from './apiClient';

export interface VideoChapter {
  id: number;
  lesson_id: number;
  title: string;
  start_time: number;
  end_time?: number;
  description?: string;
  thumbnail_url?: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateChapterData {
  title: string;
  start_time: number;
  end_time?: number;
  description?: string;
  thumbnail_url?: string;
  order?: number;
}

export interface UpdateChapterData {
  title?: string;
  start_time?: number;
  end_time?: number;
  description?: string;
  thumbnail_url?: string;
  order?: number;
  is_active?: boolean;
}

export const videoChaptersApi = {
  getChapters: async (lessonId: string): Promise<VideoChapter[]> => {
    const response = await apiClient.get<{ success: boolean; data: { chapters: VideoChapter[] } }>(
      `/lessons/${lessonId}/chapters`
    );
    return response.data.data.chapters;
  },

  createChapter: async (lessonId: string, data: CreateChapterData): Promise<VideoChapter> => {
    const response = await apiClient.post<{ success: boolean; data: { chapter: VideoChapter } }>(
      `/lessons/${lessonId}/chapters`,
      data
    );
    return response.data.data.chapter;
  },

  updateChapter: async (chapterId: string, data: UpdateChapterData): Promise<VideoChapter> => {
    const response = await apiClient.put<{ success: boolean; data: { chapter: VideoChapter } }>(
      `/chapters/${chapterId}`,
      data
    );
    return response.data.data.chapter;
  },

  deleteChapter: async (chapterId: string): Promise<boolean> => {
    const response = await apiClient.delete<{ success: boolean }>(`/chapters/${chapterId}`);
    return response.data.success;
  },

  reorderChapters: async (lessonId: string, chapterIds: number[]): Promise<boolean> => {
    const response = await apiClient.post<{ success: boolean }>(
      `/lessons/${lessonId}/chapters/reorder`,
      { chapterIds }
    );
    return response.data.success;
  }
};


