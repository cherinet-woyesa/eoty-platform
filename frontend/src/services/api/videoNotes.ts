import { apiClient } from './apiClient';

export interface VideoNote {
  id: number;
  user_id: string;
  lesson_id: number;
  content: string;
  timestamp: number;
  type: 'note' | 'bookmark';
  color: string;
  title?: string | null;
  visibility: 'private' | 'public';
  created_at: string;
  updated_at: string;
}

export interface CreateNoteData {
  content: string;
  timestamp: number;
  type?: 'note' | 'bookmark';
  color?: string;
  title?: string;
  visibility?: 'private' | 'public';
}

export interface UpdateNoteData {
  content?: string;
  timestamp?: number;
  type?: 'note' | 'bookmark';
  color?: string;
  title?: string;
  visibility?: 'private' | 'public';
}

export const videoNotesApi = {
  /**
   * Create a new note or bookmark
   */
  createNote: async (lessonId: string | number, data: CreateNoteData) => {
    const response = await apiClient.post(`/lessons/${lessonId}/notes`, data);
    return response.data;
  },

  /**
   * Get all notes for a lesson (user's notes + public notes)
   */
  getNotes: async (lessonId: string | number) => {
    const response = await apiClient.get(`/lessons/${lessonId}/notes`);
    return response.data;
  },

  /**
   * Get user's own notes for a lesson
   */
  getUserNotes: async (lessonId: string | number) => {
    const response = await apiClient.get(`/lessons/${lessonId}/notes/my`);
    return response.data;
  },

  /**
   * Update a note
   */
  updateNote: async (lessonId: string | number, noteId: number, data: UpdateNoteData) => {
    const response = await apiClient.put(`/lessons/${lessonId}/notes/${noteId}`, data);
    return response.data;
  },

  /**
   * Delete a note
   */
  deleteNote: async (lessonId: string | number, noteId: number) => {
    const response = await apiClient.delete(`/lessons/${lessonId}/notes/${noteId}`);
    return response.data;
  },

  /**
   * Get note statistics for a lesson
   */
  getStatistics: async (lessonId: string | number) => {
    const response = await apiClient.get(`/lessons/${lessonId}/notes/statistics`);
    return response.data;
  }
};


