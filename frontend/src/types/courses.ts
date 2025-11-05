export interface Course {
  id: number;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  cover_image?: string;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  
  // Publishing
  is_published: boolean;
  published_at?: Date;
  scheduled_publish_at?: Date;
  is_public?: boolean;
  
  // Statistics (computed)
  lesson_count?: number;
  student_count?: number;
  total_duration?: number; // minutes
  completion_rate?: number; // percentage
  average_rating?: number;
  
  // Additional fields
  learning_objectives?: string[];
  prerequisites?: string;
  estimated_duration?: string;
  tags?: string[];
}

export interface CourseFormData {
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  cover_image?: string;
  learning_objectives: string[];
  prerequisites: string;
  estimated_duration: string;
  tags?: string[];
}

export interface CourseEditorProps {
  courseId: string;
  onSave?: (course: Course) => void;
  onCancel?: () => void;
}

export interface Lesson {
  id: number;
  title: string;
  description?: string;
  order: number;
  duration: number; // in seconds
  video_url?: string;
  video_id?: number;
  course_id: number;
  is_published: boolean;
  published_at?: Date;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  
  // Video status
  video_status?: 'no_video' | 'uploading' | 'processing' | 'ready' | 'error';
  processing_progress?: number;
  error_message?: string;
  
  // Additional fields
  resources?: Array<{
    id?: number;
    name: string;
    url: string;
    type: string;
  }>;
  thumbnail_url?: string;
}

export interface LessonReorderItem {
  id: number;
  order: number;
}
