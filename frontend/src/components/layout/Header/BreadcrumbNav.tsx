import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home, BookOpen, Users, Settings, Award, MessageSquare, Bot } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  isCurrent?: boolean;
}

const BreadcrumbNav: React.FC = () => {
  const location = useLocation();

  const breadcrumbItems = useMemo((): BreadcrumbItem[] => {
    const pathnames = location.pathname.split('/').filter(x => x);
    
    if (pathnames.length === 0) {
      return [{ label: 'Dashboard', href: '/dashboard', icon: <Home className="h-3 w-3" />, isCurrent: true }];
    }

    const items: BreadcrumbItem[] = [];
    let accumulatedPath = '';

    // Always start with Dashboard
    items.push({
      label: 'Dashboard',
      href: '/dashboard',
      icon: <Home className="h-3 w-3" />,
      isCurrent: pathnames.length === 0
    });

    pathnames.forEach((pathname, index) => {
      // Skip duplicating the initial 'dashboard' segment since we add it manually above
      if (index === 0 && pathname.toLowerCase() === 'dashboard') {
        return;
      }
      accumulatedPath += `/${pathname}`;
      const isLast = index === pathnames.length - 1;

      // Map pathnames to friendly labels and icons
      let label = pathname.replace(/-/g, ' ');
      let icon: React.ReactNode = null;

      switch (pathname) {
        case 'admin':
          label = 'Admin';
          icon = <Settings className="h-3 w-3" />;
          break;
        case 'courses':
          label = 'Courses';
          icon = <BookOpen className="h-3 w-3" />;
          break;
        case 'users':
          label = 'Users';
          icon = <Users className="h-3 w-3" />;
          break;
        case 'forums':
          label = 'Forums';
          icon = <MessageSquare className="h-3 w-3" />;
          break;
        case 'achievements':
          label = 'Achievements';
          icon = <Award className="h-3 w-3" />;
          break;
        case 'ai-assistant':
          label = 'AI Assistant';
          icon = <Bot className="h-3 w-3" />;
          break;
        case 'analytics':
          label = 'Analytics';
          icon = <Settings className="h-3 w-3" />;
          break;
        case 'settings':
          label = 'Settings';
          icon = <Settings className="h-3 w-3" />;
          break;
        default:
          // Capitalize and format the label
          label = label.charAt(0).toUpperCase() + label.slice(1);
          if (/\d/.test(label)) {
            // If it's a numeric ID, show a more friendly label
            const parent = pathnames[index - 1];
            if (parent === 'courses') {
              label = 'Course Details';
            } else if (parent === 'users') {
              label = 'User Profile';
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
  }, [location.pathname]);

  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm" aria-label="Breadcrumb">
      {breadcrumbItems.map((item, index) => (
        <div key={`${item.href}-${index}`} className="flex items-center space-x-1">
          {index > 0 && (
            <ChevronRight className="h-3 w-3 text-gray-400 flex-shrink-0" aria-hidden="true" />
          )}
          
          {item.isCurrent ? (
            <div className="flex items-center space-x-1 max-w-32 sm:max-w-none">
              {item.icon && (
                <span className="text-gray-500 flex-shrink-0">
                  {item.icon}
                </span>
              )}
              <span 
                className="text-gray-700 font-medium truncate"
                title={item.label}
                aria-current="page"
              >
                {item.label}
              </span>
            </div>
          ) : (
            <Link
              to={item.href}
              className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 transition-colors duration-150 group max-w-32 sm:max-w-none"
            >
              {item.icon && (
                <span className="flex-shrink-0 group-hover:text-gray-700">
                  {item.icon}
                </span>
              )}
              <span 
                className="truncate group-hover:text-gray-700"
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