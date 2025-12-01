import { apiClient } from './apiClient';

export interface LandingStats {
  totalStudents: number;
  totalCourses: number;
  totalUsers: number;
  satisfactionRate: number;
}

export interface FeaturedCourse {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  level: string;
  studentCount: number;
  rating: number;
  ratingCount: number;
  instructor: string;
}

export interface Testimonial {
  id: string;
  rating: number;
  content: string;
  name: string;
  role: string;
  imageUrl?: string;
  displayOrder?: number;
}

export interface HeroContent {
  badge?: string;
  title?: string;
  titleGradient?: string;
  description?: string;
  videoUrl?: string;
  showVideo?: boolean;
}

export interface AboutContent {
  badge?: string;
  title?: string;
  description?: string;
  features?: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
}

export interface HowItWorksContent {
  badge?: string;
  title?: string;
  description?: string;
  steps?: Array<{
    step: string;
    icon: string;
    title: string;
    description: string;
    features: string[];
  }>;
}

export interface LandingContent {
  hero?: HeroContent;
  about?: AboutContent;
  howItWorks?: HowItWorksContent;
  videos?: any[];
}

export const landingApi = {
  // Get landing page statistics
  getStats: async (): Promise<{ success: boolean; data: LandingStats }> => {
    const response = await apiClient.get('/landing/stats');
    return response.data;
  },

  // Get featured courses for landing page
  getFeaturedCourses: async (): Promise<{ success: boolean; data: { courses: FeaturedCourse[] } }> => {
    const response = await apiClient.get('/landing/featured-courses');
    return response.data;
  },

  // Get testimonials for landing page
  getTestimonials: async (): Promise<{ success: boolean; data: { testimonials: Testimonial[] } }> => {
    const response = await apiClient.get('/landing/page-testimonials');
    return response.data;
  },

  // Get landing page content (hero, about, how it works)
  getContent: async (): Promise<{ success: boolean; data: LandingContent }> => {
    const response = await apiClient.get('/landing/content');
    return response.data;
  },

  // Admin: Update landing page content
  updateContent: async (section: string, content: any): Promise<{ success: boolean; data: any }> => {
    const response = await apiClient.put('/landing/content', { section, content });
    return response.data;
  },

  // Admin: Upload video for landing page
  uploadVideo: async (videoFile: File): Promise<{ success: boolean; data: any }> => {
    const formData = new FormData();
    formData.append('video', videoFile);

    const response = await apiClient.post('/landing/upload-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Admin: Save testimonial
  saveTestimonial: async (testimonial: any): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post('/landing/page-testimonials', testimonial);
    return response.data;
  },

  // Admin: Delete testimonial
  deleteTestimonial: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/landing/page-testimonials/${id}`);
    return response.data;
  }
};
