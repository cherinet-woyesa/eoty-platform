import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  Settings,
  Video,
  Bot,
  Brain,
  FolderTree,
  TrendingUp,
  Globe
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
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
  chapter_admin: 3,
  admin: 4,
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
  // PRIMARY NAVIGATION - Consolidated from 11+ items → 4 items
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'Platform overview and metrics',
    color: 'text-[#27AE60]',
    requiredRole: 'chapter_admin',
    section: 'primary',
  },
  {
    name: 'Users & Access',
    href: '/admin/all-users',
    icon: Users,
    badge: null,
    description: 'Users, Chapters & Roles',
    color: 'text-[#E74C3C]',
    requiredRole: 'chapter_admin',
    section: 'primary',
  },
  {
    name: 'Content',
    href: '/admin/all-content',
    icon: FileText,
    badge: null,
    description: 'Uploads, Moderation, Tags & Courses',
    color: 'text-[#F39C12]',
    requiredRole: 'chapter_admin',
    section: 'primary',
  },
  {
    name: 'AI Labeling',
    href: '/admin/ai-labeling',
    icon: Bot,
    badge: null,
    description: 'Label AI responses for faith alignment',
    color: 'text-[#8E44AD]',
    requiredRole: 'admin',
    section: 'primary',
  },
  {
    name: 'System',
    href: '/admin/system',
    icon: Settings,
    badge: null,
    description: 'Analytics, Config, Logs & Tools',
    color: 'text-[#2980B9]',
    requiredRole: 'admin',
    section: 'primary',
  },
];

/**
 * Navigation sections configuration for admin sidebar
 * Defines collapsible sections with headers
 */
export const adminNavSections = {
  primary: {
    title: null, // No header for primary section - all items consolidated
    collapsible: false,
    defaultExpanded: true,
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
  // PRIMARY NAVIGATION - Consolidated from 12 items → 6 items
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
    name: 'Courses',
    href: '/teacher/all-courses',
    icon: BookOpen,
    badge: null,
    description: 'My Courses, Create & Browse',
    color: 'text-[#2980B9]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'Students',
    href: '/teacher/all-students',
    icon: Users,
    badge: null,
    description: 'Students, Assignments & Analytics',
    color: 'text-[#27AE60]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'Content',
    href: '/teacher/content',
    icon: Video,
    badge: null,
    description: 'Record, Upload & Resources',
    color: 'text-[#2980B9]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'Resources',
    href: '/teacher/resources',
    icon: FileText,
    badge: null,
    description: 'Manage educational resources',
    color: 'text-[#16A085]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'AI Assistant',
    href: '/teacher/ai-assistant',
    icon: Bot,
    badge: null,
    description: 'Get teaching help and ideas',
    color: 'text-[#27AE60]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'Community',
    href: '/teacher/community',
    icon: Users,
    badge: null,
    description: 'Chapters & Achievements',
    color: 'text-[#2980B9]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'Chapters',
    href: '/teacher/chapters',
    icon: Globe,
    badge: null,
    description: 'Manage and join chapters',
    color: 'text-indigo-600',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
];

/**
 * Navigation sections configuration for teacher sidebar
 * Defines collapsible sections with headers
 */
export const teacherNavSections = {
  primary: {
    title: null, // No header for primary section - all items consolidated
    collapsible: false,
    defaultExpanded: true,
  },
};

/**
 * Student navigation items - Improved structure with clear sections
 * Organized by priority and grouped logically for better UX
 */
export const studentNavItems: NavItem[] = [
  // PRIMARY NAVIGATION - Core items, always visible (Top 6 → Reduced to 6)
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
    name: 'Courses',
    href: '/student/all-courses',
    icon: BookOpen,
    badge: null,
    description: 'My Courses, Browse, and Bookmarks',
    color: 'text-green-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'Learning',
    href: '/student/learning',
    icon: TrendingUp,
    badge: null,
    description: 'Progress, Assignments, Paths & Achievements',
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
    name: 'Community',
    href: '/student/community-hub',
    icon: Users,
    badge: null,
    description: 'Feed, Groups, Forums & Chapters',
    color: 'text-[#27AE60]',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'Chapters',
    href: '/student/chapters',
    icon: Globe,
    badge: null,
    description: 'Join local communities',
    color: 'text-indigo-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'Resources',
    href: '/student/all-resources',
    icon: FolderTree,
    badge: null,
    description: 'Library and Help Center',
    color: 'text-gray-600',
    requiredRole: 'student',
    section: 'primary',
  },
];

/**
 * Navigation sections configuration for student sidebar
 * Defines collapsible sections with headers
 */
export const studentNavSections = {
  primary: {
    title: null, // No header for primary section - all items consolidated
    collapsible: false,
    defaultExpanded: true,
  },
};
