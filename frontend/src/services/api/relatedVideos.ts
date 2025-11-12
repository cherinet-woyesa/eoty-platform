import { apiClient } from './apiClient';

export interface RelatedVideo {
  id: number;
  title: string;
  description?: string;
  duration?: number;
  order: number;
  thumbnail_url?: string;
  mux_playback_id?: string;
  video_provider?: string;
  created_at: string;
  course_id?: number;
  course_title?: string;
}

export interface RelatedVideosResponse {
  success: boolean;
  data: {
    relatedVideos: RelatedVideo[];
    currentCourse: {
      id: number;
      title: string;
    };
  };
}

export const relatedVideosApi = {
  getRelatedVideos: async (lessonId: string, limit?: number): Promise<RelatedVideosResponse['data']> => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());

    const response = await apiClient.get<RelatedVideosResponse>(
      `/lessons/${lessonId}/related?${params.toString()}`
    );
    return response.data.data;
  }
};

