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
  MessageCircle
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
}

/**
 * Role hierarchy for access control
 * Higher numbers indicate higher privilege levels
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  student: 1,
  teacher: 2,
  admin: 3,
};

/**
 * Admin navigation items
 * Accessible by admin role
 * Organized by importance and frequency of access
 */
export const adminNavItems: NavItem[] = [
  // Tier 1: Core - Most important, accessed daily
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Overview & metrics',
    color: 'text-[#39FF14]',
    requiredRole: 'admin',
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Users,
    badge: null,
    description: 'Manage users & roles',
    color: 'text-[#00FFC6]',
    requiredRole: 'admin',
  },
  {
    name: 'Courses',
    href: '/admin/courses',
    icon: BookOpen,
    badge: null,
    description: 'Manage all courses',
    color: 'text-[#00FFFF]',
    requiredRole: 'admin',
  },
  {
    name: 'Upload Queue',
    href: '/admin/content',
    icon: FileText,
    badge: null,
    description: 'Approve uploads',
    color: 'text-[#39FF14]',
    requiredRole: 'admin',
  },
  
  // Tier 2: Important - Frequently accessed
  {
    name: 'Moderation',
    href: '/admin/moderation',
    icon: Shield,
    badge: null,
    description: 'Content review',
    color: 'text-[#FFD700]',
    requiredRole: 'admin',
  },
  {
    name: 'Teacher Applications',
    href: '/admin/teacher-applications',
    icon: Users,
    badge: null,
    description: 'Review applications',
    color: 'text-[#00FFC6]',
    requiredRole: 'admin',
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart2,
    badge: null,
    description: 'Platform insights',
    color: 'text-[#00FFFF]',
    requiredRole: 'admin',
  },
  
  // Tier 3: Useful - Moderately accessed
  {
    name: 'System Config',
    href: '/admin/config',
    icon: Settings,
    badge: null,
    description: 'Manage system options',
    color: 'text-[#39FF14]',
    requiredRole: 'admin',
    children: [
      {
        name: 'Dashboard',
        href: '/admin/config/dashboard',
        icon: LayoutDashboard,
        description: 'Config overview',
        color: 'text-[#39FF14]',
        requiredRole: 'admin',
      },
      {
        name: 'Categories',
        href: '/admin/config/categories',
        icon: FolderTree,
        description: 'Course categories',
        color: 'text-[#00FFC6]',
        requiredRole: 'admin',
      },
      {
        name: 'Levels',
        href: '/admin/config/levels',
        icon: Layers,
        description: 'Difficulty levels',
        color: 'text-[#00FFFF]',
        requiredRole: 'admin',
      },
      {
        name: 'Durations',
        href: '/admin/config/durations',
        icon: Timer,
        description: 'Course durations',
        color: 'text-[#FFD700]',
        requiredRole: 'admin',
      },
      {
        name: 'Tags',
        href: '/admin/config/tags',
        icon: Hash,
        description: 'Content tags',
        color: 'text-[#39FF14]',
        requiredRole: 'admin',
      },
      {
        name: 'Chapters',
        href: '/admin/config/chapters',
        icon: BookOpen,
        description: 'Chapter management',
        color: 'text-[#00FFC6]',
        requiredRole: 'admin',
      },
    ],
  },
  {
    name: 'Tags & Categories',
    href: '/admin/tags',
    icon: Tag,
    badge: null,
    description: 'Organize content',
    color: 'text-[#00FFFF]',
    requiredRole: 'admin',
  },
  
  // Tier 4: Reference - Less frequently accessed
  {
    name: 'Mux Migration',
    href: '/admin/mux-migration',
    icon: Video,
    badge: null,
    description: 'Migrate videos to Mux',
    color: 'text-[#FFD700]',
    requiredRole: 'admin',
  },
];

/**
 * Teacher navigation items
 * Ordered by importance and frequency of access
 * Most important and frequently accessed items appear first
 */
export const teacherNavItems: NavItem[] = [
  // Tier 1: Core - Most important, accessed daily
  {
    name: 'Dashboard',
    href: '/teacher/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Teaching overview',
    color: 'text-[#39FF14]',
    requiredRole: ['teacher', 'admin'],
  },
  {
    name: 'My Courses',
    href: '/teacher/courses',
    icon: BookOpen,
    badge: null,
    description: 'Manage courses',
    color: 'text-[#00FFC6]',
    requiredRole: ['teacher', 'admin'],
  },
  {
    name: 'Record Video',
    href: '/teacher/record',
    icon: Video,
    badge: null,
    description: 'Create lessons',
    color: 'text-[#00FFFF]',
    requiredRole: ['teacher', 'admin'],
  },
  {
    name: 'Students',
    href: '/teacher/students',
    icon: Users,
    badge: null,
    description: 'Manage learners',
    color: 'text-[#39FF14]',
    requiredRole: ['teacher', 'admin'],
  },
  
  // Tier 2: Important - Frequently accessed
  {
    name: 'Assignments',
    href: '/teacher/assignments',
    icon: FileText,
    badge: null,
    description: 'Grade work',
    color: 'text-[#00FFC6]',
    requiredRole: ['teacher', 'admin'],
  },
  {
    name: 'Create Course',
    href: '/teacher/courses/new',
    icon: Sparkles,
    badge: null,
    description: 'New course',
    color: 'text-[#00FFFF]',
    requiredRole: ['teacher', 'admin'],
  },
  {
    name: 'Analytics',
    href: '/teacher/analytics',
    icon: BarChart2,
    badge: null,
    description: 'View reports',
    color: 'text-[#FFD700]',
    requiredRole: ['teacher', 'admin'],
  },
  
  // Tier 3: Useful - Moderately accessed
  {
    name: 'AI Assistant',
    href: '/ai-assistant',
    icon: Bot,
    badge: null,
    description: 'Get help',
    color: 'text-[#39FF14]',
    requiredRole: ['teacher', 'admin'],
  },
  {
    name: 'Discussions',
    href: '/forums',
    icon: MessageSquare,
    badge: null,
    description: 'Student chats',
    color: 'text-[#00FFC6]',
    requiredRole: ['teacher', 'admin'],
  },
  
  // Tier 4: Reference - Less frequently accessed
  {
    name: 'Resources',
    href: '/resources',
    icon: Upload,
    badge: null,
    description: 'Upload files',
    color: 'text-[#00FFFF]',
    requiredRole: ['teacher', 'admin'],
  },
  {
    name: 'Achievements',
    href: '/achievements',
    icon: Award,
    badge: null,
    description: 'View badges',
    color: 'text-[#FFD700]',
    requiredRole: ['teacher', 'admin'],
  },
];

/**
 * Student navigation items
 * Ordered by importance and frequency of access
 * Most important and frequently accessed items appear first
 */
export const studentNavItems: NavItem[] = [
  // Tier 1: Core - Most important, accessed daily
  {
    name: 'Dashboard',
    href: '/student/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Learning overview',
    color: 'text-blue-600',
    requiredRole: 'student',
  },
  {
    name: 'My Courses',
    href: '/student/courses',
    icon: BookOpen,
    badge: null,
    description: 'Your enrolled courses',
    color: 'text-green-600',
    requiredRole: 'student',
  },
  {
    name: 'Videos',
    href: '/student/videos',
    icon: PlayCircle,
    badge: null,
    description: 'Watch your videos',
    color: 'text-[#39FF14]',
    requiredRole: 'student',
  },
  {
    name: 'Browse Courses',
    href: '/student/browse-courses',
    icon: Search,
    badge: null,
    description: 'Discover new courses',
    color: 'text-purple-600',
    requiredRole: 'student',
  },
  {
    name: 'AI Assistant',
    href: '/ai-assistant',
    icon: Brain,
    badge: null,
    description: 'Get help',
    color: 'text-emerald-600',
    requiredRole: 'student',
  },
  
  // Tier 2: Important - Frequently accessed
  {
    name: 'Progress',
    href: '/student/progress',
    icon: BarChart3,
    badge: null,
    description: 'Track learning',
    color: 'text-orange-600',
    requiredRole: 'student',
  },
  {
    name: 'Bookmarks',
    href: '/student/bookmarks',
    icon: Bookmark,
    badge: null,
    description: 'Saved lessons',
    color: 'text-yellow-600',
    requiredRole: 'student',
  },
  
  // Tier 3: Useful - Moderately accessed
  {
    name: 'Study Paths',
    href: '/student/learning-paths',
    icon: Target,
    badge: null,
    description: 'Structured learning',
    color: 'text-indigo-600',
    requiredRole: 'student',
  },
  {
    name: 'Achievements',
    href: '/student/achievements',
    icon: Award,
    badge: null,
    description: 'View badges',
    color: 'text-amber-600',
    requiredRole: 'student',
  },
  
  // Tier 4: Social & Support - Less frequently accessed
  {
    name: 'Discussions',
    href: '/forums',
    icon: MessageSquare,
    badge: null,
    description: 'Ask questions',
    color: 'text-cyan-600',
    requiredRole: 'student',
  },
  {
    name: 'Study Groups',
    href: '/student/study-groups',
    icon: Users,
    badge: null,
    description: 'Collaborate with peers',
    color: 'text-teal-600',
    requiredRole: 'student',
  },
  
  // Tier 5: Reference - Least frequently accessed
  {
    name: 'Resources',
    href: '/resources',
    icon: FileText,
    badge: null,
    description: 'Study materials',
    color: 'text-gray-600',
    requiredRole: 'student',
  },
  {
    name: 'Help Center',
    href: '/student/help',
    icon: HelpCircle,
    badge: null,
    description: 'Get support',
    color: 'text-red-600',
    requiredRole: 'student',
  },
];
