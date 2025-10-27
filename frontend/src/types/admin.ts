export interface ContentUpload {
  id: number;
  title: string;
  description?: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size?: string;
  mime_type: string;
  uploaded_by: string;
  uploader_first_name: string;
  uploader_last_name: string;
  chapter_id: string;
  tags: string[];
  category?: string;
  status: 'pending' | 'approved' | 'rejected' | 'processing';
  rejection_reason?: string;
  approved_by?: number;
  approved_at?: string;
  approver_first_name?: string;
  approver_last_name?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface FlaggedContent {
  id: number;
  content_type: string;
  content_id: number;
  flagged_by: number;
  flagger_first_name: string;
  flagger_last_name: string;
  flag_reason: string;
  flag_details?: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  reviewed_by?: number;
  reviewed_at?: string;
  reviewer_first_name?: string;
  reviewer_last_name?: string;
  review_notes?: string;
  action_taken?: string;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsMetrics {
  users: {
    total: number;
    active: number;
    growth: number;
  };
  content: {
    total: number;
    uploads_today: number;
    approval_rate: number;
  };
  engagement: {
    forum_posts: number;
    completion_rate: number;
    avg_session_minutes: number;
  };
  technical: {
    uptime: number;
    response_time: number;
  };
}

export interface ChapterComparison {
  [chapterId: string]: {
    total_users: number;
    active_users: number;
    recent_posts: number;
    engagement_score: number;
  };
}

export interface AnalyticsTrends {
  user_growth: Array<{ date: string; new_users: number }>;
  upload_trend: Array<{ date: string; uploads: number }>;
  peak_usage_hours: {
    morning: string;
    evening: string;
  };
}

export interface SystemAlert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  chapter_id?: string;
  content_type?: string;
  count?: number;
  timestamp?: string;
}

export interface ContentTag {
  id: number;
  name: string;
  category?: string;
  color: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  admin_id: number;
  first_name: string;
  last_name: string;
  email: string;
  action_type: string;
  target_type?: string;
  target_id?: number;
  action_details: string;
  before_state?: any;
  after_state?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AdminDashboard {
  metrics: AnalyticsMetrics;
  chapter_comparison: ChapterComparison;
  trends: AnalyticsTrends;
  alerts: SystemAlert[];
  snapshot_date: string;
}

export interface UploadQueueResponse {
  success: boolean;
  data: {
    uploads: ContentUpload[];
  };
}

export interface FlaggedContentResponse {
  success: boolean;
  data: {
    flagged_content: FlaggedContent[];
    stats: {
      total: number;
      by_status: { [status: string]: number };
      by_reason: { [reason: string]: number };
      avg_review_time: number;
    };
  };
}

export interface CreateUploadRequest {
  title: string;
  description?: string;
  category?: string;
  tags: string[];
  chapterId: string;
  file: File;
}

export interface ReviewFlagRequest {
  action: 'dismiss' | 'remove' | 'warn';
  notes?: string;
  moderationAction?: string;
}