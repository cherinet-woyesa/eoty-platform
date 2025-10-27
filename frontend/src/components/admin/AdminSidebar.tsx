import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Shield, 
  Tag, 
  BarChart2, 
  Settings,
  Upload,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const AdminSidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isAdmin = user?.role === 'platform_admin';
  
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
      roles: ['chapter_admin', 'platform_admin']
    },
    {
      name: 'User Management',
      href: '/admin',
      icon: Users,
      roles: ['chapter_admin', 'platform_admin']
    },
    {
      name: 'Content Management',
      href: '/admin/content',
      icon: FileText,
      roles: ['chapter_admin', 'platform_admin']
    },
    {
      name: 'Upload Queue',
      href: '/admin/content',
      icon: Upload,
      roles: ['chapter_admin', 'platform_admin']
    },
    {
      name: 'Moderation',
      href: '/admin/moderation',
      icon: Shield,
      roles: ['chapter_admin', 'platform_admin']
    },
    {
      name: 'Tags',
      href: '/admin/tags',
      icon: Tag,
      roles: ['chapter_admin', 'platform_admin']
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart2,
      roles: ['chapter_admin', 'platform_admin']
    }
  ];

  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-2 space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                  isActive
                    ? 'bg-blue-100 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`mr-3 flex-shrink-0 h-5 w-5 ${
                    isActive ? 'text-blue-700' : 'text-gray-500'
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
      
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-700">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">
              {user?.role === 'platform_admin' ? 'Platform Admin' : 'Chapter Admin'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;