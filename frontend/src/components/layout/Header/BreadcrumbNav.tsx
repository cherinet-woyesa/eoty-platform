import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home, BookOpen, Users, Settings, Award, MessageSquare, Bot } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  isCurrent?: boolean;
}

const BreadcrumbNav: React.FC = () => {
  const location = useLocation();

  const { t } = useTranslation();

  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter(x => x);

    if (pathnames.length === 0) {
      return [{ label: t('nav.dashboard', 'Dashboard'), href: '/dashboard', icon: <Home className="h-3 w-3" />, isCurrent: true }];
    }

    const items: BreadcrumbItem[] = [];
    let accumulatedPath = '';

    // Always start with Dashboard
    items.push({
      label: t('nav.dashboard', 'Dashboard'),
      href: '/dashboard',
      icon: <Home className="h-3 w-3" />,
      isCurrent: pathnames.length === 0
    });

    pathnames.forEach((pathname, index) => {
      // Skip duplicating the initial 'dashboard' segment since we add it manually above
      if (index === 0 && pathname.toLowerCase() === 'dashboard') {
        return;
      }
      // Also skip trailing 'dashboard' segment to avoid "Dashboard > ... > Dashboard"
      if (pathname.toLowerCase() === 'dashboard' && index === pathnames.length - 1) {
        return;
      }
      accumulatedPath += `/${pathname}`;
      const isLast = index === pathnames.length - 1;

      // Map pathnames to friendly labels and icons
      let label = pathname.replace(/-/g, ' ');
      let translationKey = `nav.${pathname.toLowerCase()}`;
      let icon: React.ReactNode = null;

      switch (pathname) {
        case 'admin':
          label = t('nav.admin', 'Admin');
          icon = <Settings className="h-3 w-3" />;
          break;
        case 'teacher':
          label = t('nav.teacher', 'Teacher');
          icon = <Users className="h-3 w-3" />; // Using Users icon for Teacher
          break;
        case 'member':
          label = t('nav.member', 'Member');
          icon = <Users className="h-3 w-3" />;
          break;
        case 'courses':
          label = t('nav.courses', 'Courses');
          icon = <BookOpen className="h-3 w-3" />;
          break;
        case 'users':
          label = t('nav.users', 'Users');
          icon = <Users className="h-3 w-3" />;
          break;
        case 'forums':
          label = t('nav.forums', 'Forums');
          icon = <MessageSquare className="h-3 w-3" />;
          break;
        case 'achievements':
          label = t('nav.achievements', 'Achievements');
          icon = <Award className="h-3 w-3" />;
          break;
        case 'ai-assistant':
          label = t('nav.ai_assistant', 'AI Assistant');
          icon = <Bot className="h-3 w-3" />;
          break;
        case 'analytics':
          label = t('nav.analytics', 'Analytics');
          icon = <Settings className="h-3 w-3" />;
          break;
        case 'settings':
          label = t('nav.settings', 'Settings');
          icon = <Settings className="h-3 w-3" />;
          break;
        default:
          // Try to translate generic path segments, otherwise Capitalize
          label = t(translationKey as any, label.charAt(0).toUpperCase() + label.slice(1));

          if (/\d/.test(label)) {
            // If it's a numeric ID, show a more friendly label
            const parent = pathnames[index - 1];
            if (parent === 'courses') {
              label = t('nav.course_details', 'Course Details');
            } else if (parent === 'users') {
              label = t('nav.user_profile', 'User Profile');
            }
          }
      }

      items.push({
        label,
        href: accumulatedPath,
        icon,
        isCurrent: isLast
      });
    });

    return items;
  }, [location.pathname, t]);

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-slate-600" aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => (
        <div key={`${item.href}-${index}`} className="flex items-center space-x-1">
          {index > 0 && (
            <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" aria-hidden="true" />
          )}

          {item.isCurrent ? (
            <div className="flex items-center space-x-1 max-w-32 sm:max-w-none">
              {item.icon && (
                <span className="text-slate-500 flex-shrink-0">
                  {item.icon}
                </span>
              )}
              <span
                className="text-slate-900 font-medium truncate"
                title={item.label}
                aria-current="page"
              >
                {item.label}
              </span>
            </div>
          ) : (
            <Link
              to={item.href}
              className="flex items-center space-x-1 text-slate-600 hover:text-slate-900 transition-colors duration-150 group max-w-32 sm:max-w-none"
            >
              {item.icon && (
                <span className="flex-shrink-0 text-slate-500 group-hover:text-slate-700">
                  {item.icon}
                </span>
              )}
              <span
                className="truncate text-slate-600 group-hover:text-slate-900"
                title={item.label}
              >
                {item.label}
              </span>
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
};

export default React.memo(BreadcrumbNav);