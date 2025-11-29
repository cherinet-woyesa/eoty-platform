import { apiClient } from './apiClient';

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  points: number;
  is_manual: boolean;
  badge_type: string;
}

export const achievementsApi = {
  getAvailableBadges: async () => {
    const response = await apiClient.get('/achievements/badges/available');
    return response.data;
  },
  
  awardBadge: async (userId: number, badgeId: number) => {
    const response = await apiClient.post('/achievements/award', { userId, badgeId });
    return response.data;
  }
};
