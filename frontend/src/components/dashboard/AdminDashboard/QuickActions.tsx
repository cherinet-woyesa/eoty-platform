import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Users, BookOpen, Shield, BarChart, Plus, FileText, MessageCircle, Settings, Zap, AlertTriangle, Database, Mail } from 'lucide-react';

const QuickActions: React.FC = () => {
  const actions = [
    {
      icon: <Users className="h-5 w-5" />,
      label: 'Manage Users',
      description: 'View and manage users',
      href: '/admin/users',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: <BookOpen className="h-5 w-5" />,
      label: 'Courses',
      description: 'Manage courses',
      href: '/admin/courses',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: <Shield className="h-5 w-5" />,
      label: 'Moderation',
      description: 'Content moderation',
      href: '/admin/moderation',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50'
    },
    {
      icon: <BarChart className="h-5 w-5" />,
      label: 'Analytics',
      description: 'View platform analytics',
      href: '/admin/analytics',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: <FileText className="h-5 w-5" />,
      label: 'Resources',
      description: 'Manage resources',
      href: '/admin/resources',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: <Settings className="h-5 w-5" />,
      label: 'System',
      description: 'System settings',
      href: '/admin/system',
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50'
    }
  ];

  const handleActionClick = useCallback((action: typeof actions[0]) => {
    // Analytics tracking could be added here
    console.log(`Admin quick action clicked: ${action.label}`);
  }, []);

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Zap className="h-5 w-5 mr-2 text-yellow-500" />
        Quick Actions
      </h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {actions.map((action, index) => (
          <Link
            key={index}
            to={action.href}
            onClick={() => handleActionClick(action)}
            className={`flex flex-col items-center p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200 group ${action.bgColor} hover:scale-105`}
          >
            <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow mb-3`}>
              <div className="text-white">
                {action.icon}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900 text-sm mb-1 group-hover:text-gray-700">
                {action.label}
              </div>
              <div className="text-xs text-gray-500 group-hover:text-gray-600">
                {action.description}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-gray-900">1.2K</div>
            <div className="text-xs text-gray-500">Total Users</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">86</div>
            <div className="text-xs text-gray-500">Courses</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">3</div>
            <div className="text-xs text-gray-500">Flagged Items</div>
          </div>
          <div>
            <div className="text-lg font-bold text-gray-900">98%</div>
            <div className="text-xs text-gray-500">Uptime</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuickActions);