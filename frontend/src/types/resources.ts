export interface Resource {
  id: number;
  title: string;
  description?: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_size?: string;
  author?: string;
  category: string;
  language: string;
  chapter_id: string;
  tags: string[];
  is_public: boolean;
  requires_permission: boolean;
  uploaded_by: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserNote {
  id: number;
  user_id: number;
  resource_id: number;
  anchor_point?: string;
  content: string;
  is_public: boolean;
  metadata: any;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
}

export interface AISummary {
  id: number;
  resource_id: number;
  summary: string;
  key_points: string[];
  spiritual_insights: string[];
  summary_type: string;
  word_count: number;
  relevance_score: number;
  model_used: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceFilters {
  category?: string;
  language?: string;
  tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
}

export interface ResourceResponse {
  success: boolean;
  data: {
    resources: Resource[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface FilterOptions {
  categories: string[];
  tags: string[];
  languages: string[];
}

export interface CreateNoteRequest {
  resourceId: number;
  content: string;
  anchorPoint?: string;
  isPublic?: boolean;
  metadata?: any;
}