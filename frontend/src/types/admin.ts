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
  status: 'pending' | 'approved' | 'rejected' | 'processing' | 'failed';
  rejection_reason?: string;
  approved_by?: number;
  approved_at?: string;
  approver_first_name?: string;
  approver_last_name?: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
  // FR5: Upload time tracking
  upload_time_ms?: number;
  upload_time_minutes?: number;
  retry_count?: number;
  last_retry_at?: string;
  error_message?: string;
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
  // FR5: Review time tracking
  review_time_ms?: number;
  review_time_hours?: number;
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
  // Extended metrics for admin analytics dashboard (all optional)
  video_count?: number;
  hours_taught?: number;
  average_course_rating?: number;
  pending_reviews?: number;
  engagement_score?: number; // normalized 0–1
  // FR5: Retention metrics
  retention?: {
    new_users: number;
    retained_users: number;
    retention_rate: number;
    timeframe: string;
  };
  // FR5: Accuracy tracking
  accuracy_score?: number;
  verified_at?: string;
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
  color?: string;
  is_active: boolean;
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
  target_type: string;
  target_id: number;
  action_details: string;
  before_state?: any;
  after_state?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface UploadQueueResponse {
  success: boolean;
  data: {
    uploads: ContentUpload[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface FlaggedContentResponse {
  success: boolean;
  data: {
    flagged_content: FlaggedContent[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface CreateUploadRequest {
  title: string;
  description?: string;
  chapterId: string;
  category?: string;
  tags: string[];
  file: File;
}

export interface ReviewFlagRequest {
  action: 'dismiss' | 'remove' | 'warn';
  notes?: string;
  moderationAction?: string;
}

export interface AdminDashboard {
  metrics: AnalyticsMetrics;
  chapter_comparison: ChapterComparison;
  trends: AnalyticsTrends;
  alerts: SystemAlert[];
  snapshot_date: string;
}

export interface AIModerationItem {
  id: number;
  content_type: string;
  content_id: number;
  content_preview: string;
  moderation_score: number;
  flagged_reasons: string[];
  suggested_action: string;
  confidence: number;
  created_at: string;
}

export interface AIModerationStats {
  total_pending: number;
  high_priority: number;
  medium_priority: number;
  low_priority: number;
  avg_confidence: number;
  by_reason: Record<string, number>;
}

export interface RecentActivity {
  id: number;
  type: string;
  description: string;
  user_name: string;
  timestamp: string;
  icon?: string;
}

// FR5: Anomaly types
export interface AdminAnomaly {
  id: number;
  anomaly_type: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: number;
  created_at: string;
}

// FR5: Upload preview
export interface UploadPreview {
  id: number;
  title: string;
  description?: string;
  file_type: string;
  file_size: number;
  mime_type: string;
  thumbnail_url?: string;
  preview_url?: string;
}
