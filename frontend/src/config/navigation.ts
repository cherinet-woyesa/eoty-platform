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
  Globe,
  Calendar,
  Megaphone
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
  member: 1,
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
    name: 'nav.dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'nav.dashboard_desc',
    color: 'text-[#27AE60]',
    requiredRole: 'chapter_admin',
    section: 'primary',
  },
  {
    name: 'nav.users_access',
    href: '/admin/all-users',
    icon: Users,
    badge: null,
    description: 'nav.users_access_desc',
    color: 'text-[#E74C3C]',
    requiredRole: 'chapter_admin',
    section: 'primary',
  },
  {
    name: 'nav.content',
    href: '/admin/all-content',
    icon: FileText,
    badge: null,
    description: 'nav.content_desc',
    color: 'text-[#F39C12]',
    requiredRole: 'chapter_admin',
    section: 'primary',
  },
  {
    name: 'nav.communications',
    href: '/admin/communications',
    icon: Megaphone,
    badge: null,
    description: 'nav.communications_desc',
    color: 'text-[#3498DB]',
    requiredRole: 'chapter_admin',
    section: 'primary',
  },
  {
    name: 'nav.ai_labeling',
    href: '/admin/ai-labeling',
    icon: Bot,
    badge: null,
    description: 'nav.ai_labeling_desc',
    color: 'text-[#8E44AD]',
    requiredRole: 'admin',
    section: 'primary',
  },
  {
    name: 'nav.system',
    href: '/admin/system',
    icon: Settings,
    badge: null,
    description: 'nav.system_desc',
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
    name: 'nav.dashboard',
    href: '/teacher/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'nav.dashboard_desc',
    color: 'text-[#27AE60]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'nav.content',
    href: '/teacher/content',
    icon: Video,
    badge: null,
    description: 'nav.content_desc',
    color: 'text-[#2980B9]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'nav.resources',
    href: '/teacher/resources',
    icon: FileText,
    badge: null,
    description: 'nav.resources_desc',
    color: 'text-[#16A085]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'nav.ai_assistant',
    href: '/teacher/ai-assistant',
    icon: Bot,
    badge: null,
    description: 'nav.ai_assistant_desc',
    color: 'text-[#27AE60]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'nav.community',
    href: '/teacher/community',
    icon: Users,
    badge: null,
    description: 'nav.community_desc',
    color: 'text-[#2980B9]',
    requiredRole: ['teacher', 'admin'],
    section: 'primary',
  },
  {
    name: 'nav.chapters',
    href: '/teacher/chapters',
    icon: Globe,
    badge: null,
    description: 'nav.chapters_desc',
    color: 'text-[#27AE60]',
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
    name: 'nav.dashboard',
    href: '/member/dashboard',
    icon: LayoutDashboard,
    badge: null,
    description: 'nav.dashboard_desc',
    color: 'text-blue-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'nav.courses',
    href: '/member/all-courses',
    icon: BookOpen,
    badge: null,
    description: 'nav.courses_desc',
    color: 'text-green-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'nav.learning',
    href: '/member/learning',
    icon: TrendingUp,
    badge: null,
    description: 'nav.learning_desc',
    color: 'text-orange-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'nav.ai_assistant',
    href: '/member/ai-assistant',
    icon: Brain,
    badge: null,
    description: 'nav.ai_assistant_desc',
    color: 'text-emerald-600',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'nav.community',
    href: '/member/community-hub',
    icon: Users,
    badge: null,
    description: 'nav.community_desc',
    color: 'text-[#27AE60]',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'nav.chapters',
    href: '/member/chapters',
    icon: Globe,
    badge: null,
    description: 'nav.chapters_desc',
    color: 'text-[#27AE60]',
    requiredRole: 'student',
    section: 'primary',
  },
  {
    name: 'nav.resources',
    href: '/member/all-resources',
    icon: FolderTree,
    badge: null,
    description: 'nav.resources_desc',
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
