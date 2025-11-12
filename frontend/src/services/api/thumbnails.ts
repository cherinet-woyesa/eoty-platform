import { apiClient } from './apiClient';

export interface ThumbnailOption {
  id: string;
  url: string;
  timestamp: number;
  width: number;
  height: number;
}

export interface GenerateThumbnailsResponse {
  success: boolean;
  data: {
    thumbnails: ThumbnailOption[];
    playbackId: string;
    duration: number;
  };
}

export const thumbnailsApi = {
  generateThumbnails: async (
    lessonId: string,
    options?: { count?: number; width?: number; height?: number }
  ): Promise<GenerateThumbnailsResponse['data']> => {
    const params = new URLSearchParams();
    if (options?.count) params.append('count', options.count.toString());
    if (options?.width) params.append('width', options.width.toString());
    if (options?.height) params.append('height', options.height.toString());

    const response = await apiClient.get<GenerateThumbnailsResponse>(
      `/lessons/${lessonId}/thumbnails?${params.toString()}`
    );
    return response.data.data;
  },

  updateThumbnail: async (lessonId: string, thumbnailUrl: string): Promise<{ success: boolean; data: { thumbnailUrl: string } }> => {
    const response = await apiClient.put<{ success: boolean; data: { thumbnailUrl: string } }>(
      `/lessons/${lessonId}/thumbnail`,
      { thumbnailUrl }
    );
    return response.data;
  }
};

