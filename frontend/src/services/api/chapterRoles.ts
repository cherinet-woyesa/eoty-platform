/**
 * Chapter Roles API Service
 * Handles chapter-specific role assignments for FR7 multi-city chapter system
 */

import { apiClient } from './apiClient';
import { ApiResponse } from '@/types/api';

export interface ChapterRole {
  id: number;
  user_id: string;
  chapter_id: number;
  role: 'chapter_admin' | 'regional_coordinator';
  permissions: Record<string, any>;
  assigned_at: string;
  assigned_by: string;
  chapter_name: string;
  chapter_location: string;
  chapter_city: string;
  chapter_country: string;
  user_name?: string;
  user_email?: string;
}

export interface RegionalCoordinator extends ChapterRole {
  first_name: string;
  last_name: string;
  email: string;
}

export interface AssignChapterRoleRequest {
  userId: string;
  chapterId: number;
  role: 'chapter_admin' | 'regional_coordinator';
  permissions?: Record<string, any>;
}

export interface RemoveChapterRoleRequest {
  userId: string;
  chapterId: number;
  role: 'chapter_admin' | 'regional_coordinator';
}

class ChapterRolesApi {
  /**
   * Assign a chapter-specific role to a user
   */
  async assignChapterRole(data: AssignChapterRoleRequest): Promise<ApiResponse<{ roleId: number }>> {
    const response = await apiClient.post('/chapter-roles/assign', data);
    return response.data;
  }

  /**
   * Remove a chapter-specific role from a user
   */
  async removeChapterRole(data: RemoveChapterRoleRequest): Promise<ApiResponse<void>> {
    const response = await apiClient.delete('/chapter-roles/remove', { data });
    return response.data;
  }

  /**
   * Get all chapter-specific roles for a user
   */
  async getUserChapterRoles(userId: string): Promise<ApiResponse<{ roles: ChapterRole[] }>> {
    const response = await apiClient.get(`/chapter-roles/user/${userId}`);
    return response.data;
  }

  /**
   * Get all users with chapter-specific roles for a chapter
   */
  async getChapterRoleUsers(chapterId: number): Promise<ApiResponse<{ users: ChapterRole[] }>> {
    const response = await apiClient.get(`/chapter-roles/chapter/${chapterId}`);
    return response.data;
  }

  /**
   * Get all regional coordinators
   */
  async getRegionalCoordinators(): Promise<ApiResponse<{ coordinators: RegionalCoordinator[] }>> {
    const response = await apiClient.get('/chapter-roles/regional-coordinators');
    return response.data;
  }

  /**
   * Get all chapter admins for a region
   */
  async getRegionalAdmins(region: string): Promise<ApiResponse<{ admins: ChapterRole[] }>> {
    const response = await apiClient.get(`/chapter-roles/regional-admins/${region}`);
    return response.data;
  }

  /**
   * Check if user has a specific chapter role
   */
  async checkChapterRole(userId: string, chapterId: number, role: string): Promise<ApiResponse<{ hasRole: boolean }>> {
    const response = await apiClient.get(`/chapter-roles/check/${userId}/${chapterId}/${role}`);
    return response.data;
  }

  /**
   * Get user's effective permissions including chapter-specific roles
   */
  async getUserEffectivePermissions(userId: string, chapterId?: number): Promise<ApiResponse<{ permissions: string[] }>> {
    const params = chapterId ? { chapterId: chapterId.toString() } : {};
    const response = await apiClient.get(`/chapter-roles/permissions/${userId}`, { params });
    return response.data;
  }

  /**
   * Get all chapter role assignments
   */
  async getAllChapterRoles(): Promise<ApiResponse<{ roles: (ChapterRole & { first_name: string; last_name: string; email: string })[] }>> {
    const response = await apiClient.get('/chapter-roles/all');
    return response.data;
  }
}

export default new ChapterRolesApi();
