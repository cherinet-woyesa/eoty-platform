import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Star,
  DollarSign,
  School,
  User,
  Award,
  Bell,
  Shield,
  TrendingUp,
  Users,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Crown
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { teacherNavItems } from '@/config/navigation';
import { filterNavItems } from '@/utils/navigationFilter';
import { brandColors } from '@/theme/brand';
import { useQuery } from '@tanstack/react-query';
import teacherApi from '@/services/api/teacherApi';

interface TeacherSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse
}) => {
  const { t } = useTranslation();
  const { user, permissions } = useAuth();
  const location = useLocation();

  const isChapterAdmin = user?.role === 'chapter_admin' || user?.role === 'admin';

  // Fetch teacher profile and stats
  const { data: profileData } = useQuery({
    queryKey: ['teacher-profile'],
    queryFn: async () => {
      const res = await teacherApi.getProfile();
      return res?.data?.teacherProfile || {};
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: async () => {
      const res = await teacherApi.getDashboard();
      return res?.data || {};
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!user
  });

  // Filter navigation items based on user role and permissions
  const navigationItems = useMemo(() => {
    return filterNavItems(teacherNavItems, user?.role, permissions);
  }, [user?.role, permissions]);

  // Group navigation items by section
  const groupedNavItems = useMemo(() => {
    const groups: Record<string, typeof navigationItems> = {};
    navigationItems.forEach(item => {
      const section = item.section || 'other';
      if (!groups[section]) groups[section] = [];
      groups[section].push(item);
    });
    return groups;
  }, [navigationItems]);

  // Admin-specific items for chapter_admin and admin
  const adminItems = useMemo(() => {
    if (!isChapterAdmin) return [];
    
    return [
      {
        name: 'nav.admin_panel',
        href: '/admin',
        icon: Settings,
        badge: null,
        description: 'nav.admin_panel_desc',
        color: 'text-gray-600'
      },
      {
        name: 'nav.revenue',
        href: '/revenue',
        icon: DollarSign,
        badge: null,
        description: 'nav.revenue_desc',
        color: 'text-green-600'
      }
    ];
  }, [isChapterAdmin]);

//   const quickStats = useMemo(() => [
//     {
//       label: 'Active Students',
//       value: '247',
//       change: '+12'
//     },
//     {
//       label: 'Courses',
//       value: '8',
//       change: '+2'
//     },
//     {
//       label: 'Rating',
//       value: '4.8',
//       change: '+0.2'
//     },
//     {
//       label: 'Completion',
//       value: '78%',
//       change: '+5%'
//     }
//   ], []);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(href);
  };

  // Profile completion status
  const getProfileCompletionStatus = () => {
    if (!profileData) return { status: 'loading', percentage: 0 };

    let completed = 0;
    let total = 4;

    if (user?.firstName && user?.lastName) completed++;
    if (profileData.bio) completed++;
    if (profileData.verification_docs && Object.values(profileData.verification_docs).some(s => s === 'VERIFIED')) completed++;
    if (profileData.payout_method) completed++;

    const percentage = Math.round((completed / total) * 100);
    const status = percentage === 100 ? 'complete' : percentage >= 75 ? 'good' : percentage >= 50 ? 'warning' : 'incomplete';

    return { status, percentage, completed, total };
  };

  const profileStatus = getProfileCompletionStatus();

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-50 via-purple-50/50 to-indigo-50/30 border-r border-gray-200/60 shadow-lg transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between h-12 px-3 border-b border-slate-200 shadow-md" style={{ backgroundColor: brandColors.primaryHex }}>
        {!isCollapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
              <School className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-sm font-bold text-white">Teacher Portal</h1>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md hover:bg-white/20 transition-colors duration-200"
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 text-white" />
          ) : (
            <ChevronLeft className="h-3 w-3 text-white" />
          )}
        </button>
      </div>

      {/* Profile Section */}
      {!isCollapsed && (
        <div className="p-3 border-b border-gray-200/50 bg-white/50">
          <Link
            to="/teacher/profile"
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/80 transition-colors group"
          >
            <div className="relative">
              <img
                src={profileData?.profile_picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.firstName || 'Teacher')}&background=${brandColors.primaryHex.replace('#', '')}&color=fff`}
                alt="Profile"
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
              />
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                profileStatus.status === 'complete' ? 'bg-green-500' :
                profileStatus.status === 'good' ? 'bg-blue-500' :
                profileStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`}>
                {profileStatus.status === 'complete' ? (
                  <CheckCircle className="w-3 h-3 text-white m-0.5" />
                ) : profileStatus.status === 'incomplete' ? (
                  <AlertCircle className="w-3 h-3 text-white m-0.5" />
                ) : (
                  <div className="w-2 h-2 bg-white rounded-full m-0.5" />
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user?.firstName || 'Teacher'}
                </p>
                <div className="flex items-center space-x-1">
                  {profileData?.certifications?.length > 0 && (
                    <Award className="w-3 h-3 text-yellow-500" />
                  )}
                  {isChapterAdmin && (
                    <Crown className="w-3 h-3 text-purple-500" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {profileStatus.percentage}% complete
                </p>
                <span className="text-xs text-blue-600 hover:text-blue-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  View Profile
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                <div
                  className={`h-1 rounded-full transition-all duration-500 ${
                    profileStatus.status === 'complete' ? 'bg-green-500' :
                    profileStatus.status === 'good' ? 'bg-blue-500' :
                    profileStatus.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${profileStatus.percentage}%` }}
                />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Quick Stats */}
      {!isCollapsed && (
        <div className="p-3 border-b border-gray-200/50 bg-white/50">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
              <div className="text-lg font-bold text-gray-900">
                {dashboardData?.totalStudentsEnrolled || 0}
              </div>
              <div className="text-xs text-gray-500">Students</div>
              <div className="text-xs text-green-600 font-medium flex items-center justify-center mt-1">
                <TrendingUp className="w-3 h-3 mr-1" />
                Active
              </div>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
              <div className="text-lg font-bold text-gray-900">
                {dashboardData?.totalCourses || 0}
              </div>
              <div className="text-xs text-gray-500">Courses</div>
              <div className="text-xs text-blue-600 font-medium flex items-center justify-center mt-1">
                <BookOpen className="w-3 h-3 mr-1" />
                Created
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Quick Stats - Only when expanded
      {!isCollapsed && (
        <div className="p-3 border-b border-gray-200/50 bg-white/50">
          <div className="grid grid-cols-2 gap-2">
            {quickStats.map((stat, index) => (
              <div key={index} className="text-center p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                <div className="text-lg font-bold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
                <div className="text-xs text-green-600 font-medium">{stat.change}</div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* Navigation - Fills available space */}
      <div className="flex-1 overflow-y-auto py-4 bg-gradient-to-b from-white/40 to-transparent">
        <nav className="space-y-1 px-2">
          {/* Primary Section */}
          {groupedNavItems.primary && groupedNavItems.primary.length > 0 && (
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Primary
                  </h3>
                </div>
              )}
              {groupedNavItems.primary.map((item) => {
                const active = isActive(item.href);
                const IconComponent = item.icon as React.ElementType;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-brand-primary/10 text-brand-primary shadow-sm border border-brand-primary/20'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:shadow-sm'
                    }`}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg ${
                      active ? 'bg-brand-primary/20' : 'bg-white/80 group-hover:bg-white'
                    } transition-all duration-200 shadow-sm`}>
                      <IconComponent className={`h-5 w-5 ${active ? 'text-brand-primary' : 'text-gray-500 group-hover:text-gray-700'}`} />
                    </div>

                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate font-semibold">{t(item.name)}</span>
                          {item.badge && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{t(item.description)}</p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Teaching Section */}
          {groupedNavItems.teaching && groupedNavItems.teaching.length > 0 && (
            <div className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 py-2 mt-4">
                  <div className="border-t border-gray-200 mb-2"></div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Teaching
                  </h3>
                </div>
              )}
              {groupedNavItems.teaching.map((item) => {
                const active = isActive(item.href);
                const IconComponent = item.icon as React.ElementType;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-200/50'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                      active ? 'bg-blue-100' : 'bg-white/80 group-hover:bg-white'
                    } transition-colors duration-200`}>
                      <IconComponent className={`h-4 w-4 ${active ? 'text-blue-700' : 'text-gray-500 group-hover:text-gray-700'}`} />
                    </div>

                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <span className="truncate">{t(item.name)}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Other Sections */}
          {Object.entries(groupedNavItems)
            .filter(([section]) => !['primary', 'teaching'].includes(section))
            .map(([section, items]) => (
              <div key={section} className="space-y-1">
                {!isCollapsed && items.length > 0 && (
                  <div className="px-3 py-2 mt-4">
                    <div className="border-t border-gray-200 mb-2"></div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {section === 'system' ? 'System' : section === 'reference' ? 'Reference' : 'Other'}
                    </h3>
                  </div>
                )}
                {items.map((item) => {
                  const active = isActive(item.href);
                  const IconComponent = item.icon as React.ElementType;

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                        active
                          ? 'bg-gray-100 text-gray-700 shadow-sm border border-gray-200/50'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                      title={isCollapsed ? item.description : undefined}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                        active ? 'bg-gray-200' : 'bg-white/80 group-hover:bg-white'
                      } transition-colors duration-200`}>
                        <IconComponent className={`h-4 w-4 ${active ? 'text-gray-700' : 'text-gray-500 group-hover:text-gray-700'}`} />
                      </div>

                      {!isCollapsed && (
                        <div className="ml-3 flex-1 min-w-0">
                          <span className="truncate">{t(item.name)}</span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))
          }

        </nav>

        {/* Admin Section */}
        {isChapterAdmin && adminItems.length > 0 && (
          <>
            <div className="px-2 py-4">
              <div className="border-t border-gray-200"></div>
            </div>
            {!isCollapsed && (
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {t('nav.admin_panel')}
                </h3>
              </div>
            )}
            <nav className="space-y-1 px-2">
              {adminItems.map((item) => {
                const active = isActive(item.href);
                const IconComponent = item.icon as React.ElementType;
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-gray-100 text-gray-700 shadow-sm border border-gray-200/50'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={isCollapsed ? item.description : undefined}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg ${
                      active ? 'bg-gray-200' : 'bg-gray-100 group-hover:bg-gray-200'
                    } transition-colors duration-200`}>
                      <IconComponent className={`h-4 w-4 ${active ? item.color : 'text-gray-500 group-hover:text-gray-700'}`} />
                    </div>
                    
                    {!isCollapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="truncate">{item.name}</span>
                          {item.badge && (
                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{item.description}</p>
                      </div>
                    )}
                  </Link>
                );
              })}
            </nav>
          </>
        )}
      </div>
    </div>
  );
};

export default React.memo(TeacherSidebar);