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
  chapter_admin: 3,
  platform_admin: 4,
};

/**
 * Admin navigation items
 * Accessible by chapter_admin and platform_admin roles
 */
export const adminNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Overview & metrics',
    color: 'text-blue-600',
    requiredRole: ['chapter_admin', 'platform_admin'],
  },
  {
    name: 'User Management',
    href: '/admin/users',
    icon: Users,
    badge: null,
    description: 'Manage users & roles',
    color: 'text-indigo-600',
    requiredRole: ['chapter_admin', 'platform_admin'],
  },
  {
    name: 'Courses',
    href: '/admin/courses',
    icon: BookOpen,
    badge: null,
    description: 'Manage all courses',
    color: 'text-green-600',
    requiredRole: ['chapter_admin', 'platform_admin'],
  },
  {
    name: 'Upload Queue',
    href: '/admin/content',
    icon: FileText,
    badge: null,
    description: 'Approve uploads',
    color: 'text-purple-600',
    requiredRole: ['chapter_admin', 'platform_admin'],
  },
  {
    name: 'Moderation',
    href: '/admin/moderation',
    icon: Shield,
    badge: null,
    description: 'Content review',
    color: 'text-red-600',
    requiredRole: ['chapter_admin', 'platform_admin'],
  },
  {
    name: 'Tags & Categories',
    href: '/admin/tags',
    icon: Tag,
    badge: null,
    description: 'Organize content',
    color: 'text-pink-600',
    requiredRole: ['chapter_admin', 'platform_admin'],
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart2,
    badge: null,
    description: 'Platform insights',
    color: 'text-orange-600',
    requiredRole: ['chapter_admin', 'platform_admin'],
  },
  {
    name: 'System Config',
    href: '/admin/config',
    icon: Settings,
    badge: null,
    description: 'Manage system options',
    color: 'text-gray-600',
    requiredRole: ['chapter_admin', 'platform_admin'],
    children: [
      {
        name: 'Categories',
        href: '/admin/config/categories',
        icon: FolderTree,
        description: 'Course categories',
        color: 'text-blue-600',
        requiredRole: ['chapter_admin', 'platform_admin'],
      },
      {
        name: 'Levels',
        href: '/admin/config/levels',
        icon: Layers,
        description: 'Difficulty levels',
        color: 'text-green-600',
        requiredRole: ['chapter_admin', 'platform_admin'],
      },
      {
        name: 'Durations',
        href: '/admin/config/durations',
        icon: Timer,
        description: 'Course durations',
        color: 'text-purple-600',
        requiredRole: ['chapter_admin', 'platform_admin'],
      },
      {
        name: 'Tags',
        href: '/admin/config/tags',
        icon: Hash,
        description: 'Content tags',
        color: 'text-pink-600',
        requiredRole: ['chapter_admin', 'platform_admin'],
      },
      {
        name: 'Chapters',
        href: '/admin/config/chapters',
        icon: BookOpen,
        description: 'Chapter management',
        color: 'text-indigo-600',
        requiredRole: ['chapter_admin', 'platform_admin'],
      },
    ],
  },
];

/**
 * Teacher navigation items
 * Accessible by teacher, chapter_admin, and platform_admin roles
 */
export const teacherNavItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/teacher/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Teaching overview',
    color: 'text-blue-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'My Courses',
    href: '/teacher/courses',
    icon: BookOpen,
    badge: null,
    description: 'Manage courses',
    color: 'text-green-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'Record Video',
    href: '/record',
    icon: Video,
    badge: null,
    description: 'Create lessons',
    color: 'text-red-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'Create Course',
    href: '/courses/new',
    icon: Sparkles,
    badge: null,
    description: 'New course',
    color: 'text-purple-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'Students',
    href: '/students',
    icon: Users,
    badge: null,
    description: 'Manage learners',
    color: 'text-indigo-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart2,
    badge: null,
    description: 'View reports',
    color: 'text-orange-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'Discussions',
    href: '/forums',
    icon: MessageSquare,
    badge: null,
    description: 'Student chats',
    color: 'text-pink-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'Assignments',
    href: '/assignments',
    icon: FileText,
    badge: null,
    description: 'Grade work',
    color: 'text-amber-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'Resources',
    href: '/resources',
    icon: Upload,
    badge: null,
    description: 'Upload files',
    color: 'text-emerald-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'AI Assistant',
    href: '/ai-assistant',
    icon: Bot,
    badge: null,
    description: 'Get help',
    color: 'text-cyan-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
  {
    name: 'Achievements',
    href: '/achievements',
    icon: Award,
    badge: null,
    description: 'View badges',
    color: 'text-yellow-600',
    requiredRole: ['teacher', 'chapter_admin', 'platform_admin'],
  },
];

/**
 * Student navigation items
 * Accessible by all authenticated users (role hierarchy applies)
 */
export const studentNavItems: NavItem[] = [
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
    href: '/courses',
    icon: BookOpen,
    badge: null,
    description: 'Continue learning',
    color: 'text-green-600',
    requiredRole: 'student',
  },
  {
    name: 'Browse Courses',
    href: '/catalog',
    icon: Search,
    badge: null,
    description: 'Discover new courses',
    color: 'text-purple-600',
    requiredRole: 'student',
  },
  {
    name: 'Study Paths',
    href: '/learning-paths',
    icon: Target,
    badge: null,
    description: 'Structured learning',
    color: 'text-indigo-600',
    requiredRole: 'student',
  },
  {
    name: 'Bookmarks',
    href: '/bookmarks',
    icon: Bookmark,
    badge: null,
    description: 'Saved lessons',
    color: 'text-yellow-600',
    requiredRole: 'student',
  },
  {
    name: 'Study Schedule',
    href: '/schedule',
    icon: Calendar,
    badge: null,
    description: 'Plan your study',
    color: 'text-pink-600',
    requiredRole: 'student',
  },
  {
    name: 'Progress',
    href: '/progress',
    icon: BarChart3,
    badge: null,
    description: 'Track learning',
    color: 'text-orange-600',
    requiredRole: 'student',
  },
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
    href: '/study-groups',
    icon: Users,
    badge: null,
    description: 'Collaborate with peers',
    color: 'text-teal-600',
    requiredRole: 'student',
  },
  {
    name: 'Achievements',
    href: '/achievements',
    icon: Award,
    badge: null,
    description: 'View badges',
    color: 'text-amber-600',
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
    href: '/help',
    icon: HelpCircle,
    badge: null,
    description: 'Get support',
    color: 'text-red-600',
    requiredRole: 'student',
  },
];
