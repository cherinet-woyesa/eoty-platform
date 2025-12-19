export interface Resource {
  id: number;
  title: string;
  description?: string;
  file_name: string;
  file_type: string;
  file_path: string;
  file_url?: string;
  url?: string; // Legacy support
  file_size?: string;
  author?: string;
  category: string;
  language: string;
  chapter_id: string;
  tags: string[];
  is_public: boolean;
  requires_permission: boolean;
  resource_scope?: 'platform_wide' | 'chapter_wide' | 'course_specific';
  uploaded_by: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserNote {
  id: number;
  user_id: number;
  resource_id: number;
  anchor_point?: string; // Legacy support
  section_anchor?: string; // REQUIREMENT: Anchor notes to sections
  section_text?: string; // REQUIREMENT: Anchor notes to sections
  section_position?: number; // REQUIREMENT: Anchor notes to sections
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
  meets_word_limit?: boolean; // REQUIREMENT: < 250 words
  meets_relevance_requirement?: boolean; // REQUIREMENT: 98% relevance
  admin_validated?: boolean; // REQUIREMENT: Admin validation
  admin_relevance_score?: number; // REQUIREMENT: Admin validation
  created_at: string;
  updated_at: string;
}

export interface ResourceFilters {
  category?: string;
  language?: string;
  tags?: string[];
  search?: string;
  type?: string; // REQUIREMENT: Type filter
  topic?: string; // REQUIREMENT: Topic filter
  author?: string; // REQUIREMENT: Author filter
  dateFrom?: string; // REQUIREMENT: Date filter
  dateTo?: string; // REQUIREMENT: Date filter
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
  types?: string[]; // REQUIREMENT: Type filter
  topics?: string[]; // REQUIREMENT: Topic filter
  authors?: string[]; // REQUIREMENT: Author filter
}

export interface CreateNoteRequest {
  resourceId: number;
  content: string;
  anchorPoint?: string; // Legacy support
  sectionAnchor?: string; // REQUIREMENT: Anchor notes to sections
  sectionText?: string; // REQUIREMENT: Anchor notes to sections
  sectionPosition?: number; // REQUIREMENT: Anchor notes to sections
  isPublic?: boolean;
  metadata?: any;
}