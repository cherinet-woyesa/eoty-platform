export interface Forum {
  id: number;
  title: string;
  description?: string;
  chapter_id: string;
  is_public: boolean;
  is_active: boolean;
  created_by: number;
  moderation_rules?: any;
  created_at: string;
  updated_at: string;
}

export interface ForumTopic {
  id: number;
  forum_id: number;
  title: string;
  content: string;
  author_id: number;
  author_first_name: string;
  author_last_name: string;
  author_chapter: string;
  is_pinned: boolean;
  is_locked: boolean;
  view_count: number;
  post_count: number;
  last_post_id?: number;
  last_activity_at: string;
  last_post_at?: string;
  last_post_first_name?: string;
  last_post_last_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ForumPost {
  id: number;
  topic_id: number;
  author_id: number;
  first_name: string;
  last_name: string;
  author_chapter: string;
  content: string;
  parent_id?: number;
  reply_count: number;
  like_count: number;
  is_moderated: boolean;
  moderation_reason?: string;
  metadata?: any;
  replies?: ForumPost[];
  created_at: string;
  updated_at: string;
}

export interface Badge {
  id: number;
  name: string;
  description: string;
  icon_url: string;
  badge_type: string;
  category: string;
  points: number;
  requirements: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: number;
  user_id: number;
  badge_id: number;
  earned_at: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  name: string;
  description: string;
  icon_url: string;
  badge_type: string;
  points: number;
}

export interface LeaderboardEntry {
  id: number;
  user_id: number;
  chapter_id: string;
  leaderboard_type: string;
  points: number;
  rank: number;
  is_anonymous: boolean;
  period_date?: string;
  first_name: string;
  last_name: string;
 
  created_at: string;
  updated_at: string;
}

export interface LeaderboardResponse {
  success: boolean;
  data: {
    leaderboard: LeaderboardEntry[];
    user_rank: number | null;
    leaderboard_type: string;
    period: string;
  };
}

export interface BadgeProgress {
  [key: string]: {
    current: number;
    required: number;
  };
}

export interface CreateTopicRequest {
  forumId: number;
  title: string;
  content: string;
}

export interface CreatePostRequest {
  topicId: number;
  content: string;
  parentId?: number;
}

export interface Chapter {
  id: number;
  name: string;
  location: string;
  description: string;
}