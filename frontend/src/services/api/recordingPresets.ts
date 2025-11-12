import { apiClient } from './apiClient';

export interface RecordingPreset {
  id: number;
  user_id: string;
  name: string;
  quality: '480p' | '720p' | '1080p';
  frame_rate: number;
  bitrate?: number;
  auto_adjust_quality: boolean;
  video_device_id?: string;
  audio_device_id?: string;
  enable_screen: boolean;
  layout: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreatePresetData {
  name: string;
  quality?: '480p' | '720p' | '1080p';
  frame_rate?: number;
  bitrate?: number;
  auto_adjust_quality?: boolean;
  video_device_id?: string;
  audio_device_id?: string;
  enable_screen?: boolean;
  layout?: string;
  is_default?: boolean;
}

export interface UpdatePresetData {
  name?: string;
  quality?: '480p' | '720p' | '1080p';
  frame_rate?: number;
  bitrate?: number;
  auto_adjust_quality?: boolean;
  video_device_id?: string;
  audio_device_id?: string;
  enable_screen?: boolean;
  layout?: string;
  is_default?: boolean;
}

export const recordingPresetsApi = {
  getPresets: async (): Promise<RecordingPreset[]> => {
    const response = await apiClient.get<{ success: boolean; data: { presets: RecordingPreset[] } }>(
      '/recording-presets'
    );
    return response.data.data.presets;
  },

  getPreset: async (presetId: string): Promise<RecordingPreset> => {
    const response = await apiClient.get<{ success: boolean; data: { preset: RecordingPreset } }>(
      `/recording-presets/${presetId}`
    );
    return response.data.data.preset;
  },

  getDefaultPreset: async (): Promise<RecordingPreset | null> => {
    const response = await apiClient.get<{ success: boolean; data: { preset: RecordingPreset | null } }>(
      '/recording-presets/default'
    );
    return response.data.data.preset;
  },

  createPreset: async (data: CreatePresetData): Promise<RecordingPreset> => {
    const response = await apiClient.post<{ success: boolean; data: { preset: RecordingPreset } }>(
      '/recording-presets',
      data
    );
    return response.data.data.preset;
  },

  updatePreset: async (presetId: string, data: UpdatePresetData): Promise<RecordingPreset> => {
    const response = await apiClient.put<{ success: boolean; data: { preset: RecordingPreset } }>(
      `/recording-presets/${presetId}`,
      data
    );
    return response.data.data.preset;
  },

  deletePreset: async (presetId: string): Promise<boolean> => {
    const response = await apiClient.delete<{ success: boolean }>(`/recording-presets/${presetId}`);
    return response.data.success;
  }
};

