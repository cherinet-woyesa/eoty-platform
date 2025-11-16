/**
 * FR7: Activity Logs API
 * REQUIREMENT: Login history, abnormal activity alerts
 */

import { apiClient } from './apiClient';

export interface ActivityLog {
  id: number;
  user_id: number;
  activity_type: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
  browser: string;
  os: string;
  location: string;
  success: boolean;
  failure_reason: string | null;
  metadata: any;
  created_at: string;
}

export interface AbnormalActivityAlert {
  id: number;
  user_id: number;
  alert_type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: number | null;
  activity_data: any;
  created_at: string;
}

export const activityApi = {
  /**
   * Get user's activity logs (REQUIREMENT: Login history)
   */
  getActivityLogs: async (options?: {
    limit?: number;
    offset?: number;
    activityType?: string;
  }) => {
    const response = await apiClient.get('/auth/activity-logs', { params: options });
    return response.data;
  },

  /**
   * Get abnormal activity alerts (REQUIREMENT: Abnormal activity alerts)
   */
  getAbnormalActivityAlerts: async () => {
    const response = await apiClient.get('/auth/abnormal-activity-alerts');
    return response.data;
  }
};

