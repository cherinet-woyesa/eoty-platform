import { ReactNode } from 'react';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  Shield,
  Tag,
  BarChart2,
  Settings,
  Video,
  MessageSquare,
  Award,
  Bot,
  Sparkles,
  Upload,
  Clock,
  Star,
  Target,
  DollarSign,
  School,
  Bookmark,
  Calendar,
  HelpCircle,
  Brain,
  Search,
  FolderTree,
  Layers,
  Timer,
  Hash,
  Crown,
  PlayCircle,
  Zap,
  BarChart3,
  MessageCircle,
  Users as UsersIcon,
  Shield as ShieldIcon,
  Globe as GlobeIcon
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: ReactNode;
  badge?: string | number | null;
  description: string;
  color?: string;
  requiredRole?: string | string[];
  requiredPermission?: string;
  children?: NavItem[];
  section?: 'primary' | 'learning' | 'teaching' | 'community' | 'resources' | 'content' | 'system' | 'reference'; // Section grouping for navigation
}

/**
 * Role hierarchy for access control
 * Higher numbers indicate higher privilege levels
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  // Base members
  user: 1,
  // Legacy alias kept for compatibility
  student: 1,
  // Elevated roles
  teacher: 2,
  admin: 3,
};

/**
 * Admin navigation items
 * Accessible by admin role
 * Organized by importance and frequency of access
 */
/**
 * Admin navigation items - Improved structure with clear sections
 * Organized by priority and grouped logically for better UX
 */
export const adminNavItems: NavItem[] = [
  // PRIMARY NAVIGATION - Core admin activities (Top 6)
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Platform overview and metrics',
    color: 'text-[#27AE60]',
    requiredRole: 'admin',
    section: 'primary',
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Users,
    badge: null,
    description: 'Manage users and roles',
    color: 'text-[#16A085]',
    requiredRole: 'admin',
    section: 'primary',
  },
  {
    name: 'Courses',
    href: '/admin/courses',
    icon: BookOpen,
    badge: null,
    description: 'Manage all courses',
    color: 'text-[#2980B9]',
    requiredRole: 'admin',
    section: 'primary',
  },
  {
    name: 'Upload Queue',
    href: '/admin/content',
    icon: FileText,
    badge: null,
    description: 'Review and approve uploads',
    color: 'text-[#27AE60]',
    requiredRole: 'admin',
    section: 'primary',
  },
  {
    name: 'Moderation',
    href: '/admin/moderation',
    icon: Shield,
    badge: null,
    description: 'Content moderation and review',
    color: 'text-[#F39C12]',
    requiredRole: 'admin',
    section: 'primary',
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart2,
    badge: null,
    description: 'Platform analytics and insights',
    color: 'text-[#2980B9]',
    requiredRole: 'admin',
    section: 'primary',
  },
  
  // CONTENT MANAGEMENT SECTION - Content and application management
  {
    name: 'Teacher Applications',
    href: '/admin/teacher-applications',
    icon: Users,
    badge: null,
    description: 'Review teacher applications',
    color: 'text-[#16A085]',
    requiredRole: 'admin',
    section: 'content',
  },
  {
    name: 'Tags & Categories',
    href: '/admin/tags',
    icon: Tag,
    badge: null,
    description: 'Organize content tags and categories',
    color: 'text-[#2980B9]',
    requiredRole: 'admin',
    section: 'content',
  },
  {
    name: 'System Config',
    href: '/admin/config',
    icon: Settings,
    badge: null,
    description: 'System configuration and settings',
    color: 'text-[#27AE60]',
    requiredRole: 'admin',
    section: 'content',
    children: [
      {
        name: 'Dashboard',
        href: '/admin/config/dashboard',
        icon: LayoutDashboard,
        description: 'Config overview',
        color: 'text-[#27AE60]',
        requiredRole: 'admin',
      },
      {
        name: 'Categories',
        href: '/admin/config/categories',
        icon: FolderTree,
        description: 'Course categories',
        color: 'text-[#16A085]',
        requiredRole: 'admin',
      },
      {
        name: 'Levels',
        href: '/admin/config/levels',
        icon: Layers,
        description: 'Difficulty levels',
        color: 'text-[#2980B9]',
        requiredRole: 'admin',
      },
      {
        name: 'Durations',
        href: '/admin/config/durations',
        icon: Timer,
        description: 'Course durations',
        color: 'text-[#F39C12]',
        requiredRole: 'admin',
      },
      {
        name: 'Tags',
        href: '/admin/config/tags',
        icon: Hash,
        description: 'Content tags',
        color: 'text-[#27AE60]',
        requiredRole: 'admin',
      },
      {
        name: 'Chapters',
        href: '/admin/config/chapters',
        icon: BookOpen,
        description: 'Chapter management',
        color: 'text-[#16A085]',
        requiredRole: 'admin',
      },
    ],
  },
  
  // SYSTEM TOOLS SECTION - System maintenance and tools
  {
    name: 'Mux Migration',
    href: '/admin/mux-migration',
    icon: Video,
    badge: null,
    description: 'Migrate videos to Mux platform',
    color: 'text-[#F39C12]',
    requiredRole: 'admin',
    section: 'system',
  },
  
  // REFERENCE SECTION - Reference and logs
  {
    name: 'Chapters',
    href: '/admin/chapters',
    icon: UsersIcon,
    badge: null,
    description: 'Manage chapters',
    color: 'text-[#16A085]',
    requiredRole: 'admin',
    section: 'reference',
  },
  {
    name: 'Activity Logs',
    href: '/admin/activity-logs',
    icon: ShieldIcon,
    badge: null,
    description: 'View system activity logs',
    color: 'text-[#2980B9]',
    requiredRole: 'admin',
    section: 'reference',
  },
];

/**
 * Navigation sections configuration for admin sidebar
 * Defines collapsible sections with headers
 */
export const adminNavSections = {
  primary: {
    title: null, // No header for primary section
    collapsible: false,
    defaultExpanded: true,
  },
  content: {
    title: 'Content Management',
    icon: FileText,
    collapsible: true,
    defaultExpanded: true,
  },
  system: {
    title: 'System Tools',
    icon: Settings,
    collapsible: true,
    defaultExpanded: false,
  },
  reference: {
    title: 'Reference',
    icon: Shield,
    collapsible: true,
    defaultExpanded: false,
  },
};

/**
 * Teacher navigation items
 * Ordered by importance and frequency of access
 * Most important and frequently accessed items appear first
 */
/**
 * Teacher navigation items - Improved structure with clear sections
 * Organized by priority and grouped logically for better UX
 */
export const teacherNavItems: NavItem[] = [
  // PRIMARY NAVIGATION - Core teaching activities (Top 6)
  {
    name: 'Dashboard',
    href: '/teacher/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Teaching overview and stats',
    color: 'text-[#27AE60]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'My Courses',
    href: '/teacher/courses',
    icon: BookOpen,
    badge: null,
    description: 'Manage your courses',
    color: 'text-[#16A085]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'Create Course',
    href: '/teacher/courses/new',
    icon: Sparkles,
    badge: null,
    description: 'Create a new course',
    color: 'text-[#2980B9]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'Record Video',
    href: '/teacher/record',
    icon: Video,
    badge: null,
    description: 'Record and upload lessons',
    color: 'text-[#2980B9]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'Students',
    href: '/teacher/students',
    icon: Users,
    badge: null,
    description: 'Manage your students',
    color: 'text-[#27AE60]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'Analytics',
    href: '/teacher/analytics',
    icon: BarChart2,
    badge: null,
    description: 'View course analytics',
    color: 'text-[#F39C12]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  
  // TEACHING TOOLS SECTION - Teaching support tools
  {
    name: 'Assignments',
    href: '/teacher/assignments',
    icon: FileText,
    badge: null,
    description: 'Grade assignments and quizzes',
    color: 'text-[#16A085]',
    requiredRole: ['teacher', 'admin'],
    section: 'teaching',
  },
  {
    name: 'AI Assistant',
    href: '/teacher/ai-assistant',
    icon: Bot,
    badge: null,
    description: 'Get teaching help and ideas',
    color: 'text-[#27AE60]',
    requiredRole: ['teacher', 'admin'],
    section: 'teaching',
  },
  {
    name: 'Discussions',
    href: '/teacher/forums',
    icon: MessageSquare,
    badge: null,
    description: 'Engage with students',
    color: 'text-[#16A085]',
    requiredRole: ['teacher', 'admin'],
    section: 'teaching',
  },
  
  // COMMUNITY SECTION - Social and collaboration
  {
    name: 'Chapters',
    href: '/teacher/chapters',
    icon: UsersIcon,
    badge: null,
    description: 'Join and manage chapters',
    color: 'text-[#16A085]',
    requiredRole: ['teacher', 'admin'],
    section: 'community',
  },
  
  // RESOURCES SECTION - Support and reference
  {
    name: 'Resources',
    href: '/teacher/resources',
    icon: Upload,
    badge: null,
    description: 'Upload and manage resources',
    color: 'text-[#2980B9]',
    requiredRole: ['teacher', 'admin'],
    section: 'resources',
  },
  {
    name: 'Achievements',
    href: '/teacher/achievements',
    icon: Award,
    badge: null,
    description: 'View teaching achievements',
    color: 'text-[#F39C12]',
    requiredRole: ['teacher', 'admin'],
    section: 'resources',
  },
];

/**
 * Navigation sections configuration for teacher sidebar
 * Defines collapsible sections with headers
 */
export const teacherNavSections = {
  primary: {
    title: null, // No header for primary section
    collapsible: false,
    defaultExpanded: true,
  },
  teaching: {
    title: 'Teaching Tools',
    icon: BookOpen,
    collapsible: true,
    defaultExpanded: true,
  },
  community: {
    title: 'Community',
    icon: Users,
    collapsible: true,
    defaultExpanded: false,
  },
  resources: {
    title: 'Resources',
    icon: Upload,
    collapsible: true,
    defaultExpanded: false,
  },
};

/**
 * Student navigation items - Improved structure with clear sections
 * Organized by priority and grouped logically for better UX
 */
export const studentNavItems: NavItem[] = [
  // PRIMARY NAVIGATION - Core items, always visible (Top 6)
  {
    name: 'Dashboard',
    href: '/student/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Learning overview and quick stats',
    color: 'text-blue-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'My Courses',
    href: '/student/courses',
    icon: BookOpen,
    badge: null,
    description: 'Your enrolled courses and lessons',
    color: 'text-green-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'Browse Courses',
    href: '/student/browse-courses',
    icon: Search,
    badge: null,
    description: 'Discover and enroll in new courses',
    color: 'text-purple-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'Progress',
    href: '/student/progress',
    icon: BarChart3,
    badge: null,
    description: 'Track your learning progress',
    color: 'text-orange-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'AI Assistant',
    href: '/student/ai-assistant',
    icon: Brain,
    badge: null,
    description: 'Get instant help and answers',
    color: 'text-emerald-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'Discussions',
    href: '/student/forums',
    icon: MessageSquare,
    badge: null,
    description: 'Ask questions and join discussions',
    color: 'text-cyan-600',
    requiredRole: 'student',
    section: 'primary',
  },
  
  // LEARNING SECTION - Learning-related tools
  {
    name: 'Bookmarks',
    href: '/student/bookmarks',
    icon: Bookmark,
    badge: null,
    description: 'Your saved lessons and courses',
    color: 'text-yellow-600',
    requiredRole: 'student',
    section: 'learning',
  },
  {
    name: 'Study Paths',
    href: '/student/learning-paths',
    icon: Target,
    badge: null,
    description: 'Structured learning paths',
    color: 'text-indigo-600',
    requiredRole: 'student',
    section: 'learning',
  },
  {
    name: 'Achievements',
    href: '/student/achievements',
    icon: Award,
    badge: null,
    description: 'View your badges and achievements',
    color: 'text-amber-600',
    requiredRole: 'student',
    section: 'learning',
  },
  
  // COMMUNITY SECTION - Social and collaboration
  {
    name: 'Study Groups',
    href: '/student/study-groups',
    icon: Users,
    badge: null,
    description: 'Collaborate with study partners',
    color: 'text-teal-600',
    requiredRole: 'student',
    section: 'community',
  },
  {
    name: 'Chapters',
    href: '/student/chapters',
    icon: UsersIcon,
    badge: null,
    description: 'Join and manage chapters',
    color: 'text-blue-600',
    requiredRole: 'student',
    section: 'community',
  },
  
  // RESOURCES SECTION - Support and reference
  {
    name: 'Resources',
    href: '/student/resources',
    icon: FileText,
    badge: null,
    description: 'Study materials and documents',
    color: 'text-gray-600',
    requiredRole: 'student',
    section: 'resources',
  },
  {
    name: 'Help Center',
    href: '/student/help',
    icon: HelpCircle,
    badge: null,
    description: 'Get help and support',
    color: 'text-red-600',
    requiredRole: 'student',
    section: 'resources',
  },
];

/**
 * Navigation sections configuration for student sidebar
 * Defines collapsible sections with headers
 */
export const studentNavSections = {
  primary: {
    title: null, // No header for primary section
    collapsible: false,
    defaultExpanded: true,
  },
  learning: {
    title: 'Learning',
    icon: BookOpen,
    collapsible: true,
    defaultExpanded: true,
  },
  community: {
    title: 'Community',
    icon: Users,
    collapsible: true,
    defaultExpanded: false,
  },
  resources: {
    title: 'Resources',
    icon: FileText,
    collapsible: true,
    defaultExpanded: false,
  },
};
