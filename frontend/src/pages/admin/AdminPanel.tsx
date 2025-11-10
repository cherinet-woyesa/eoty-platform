import React, { useMemo, useCallback } from 'react';
import { 
  Users, 
  Upload, 
  Shield, 
  BarChart3, 
  Tag, 
  FileText, 
  AlertTriangle, 
  Home,
  LogOut
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminSidebar from '../../components/layout/Sidebar/AdminSidebar';

// Memoized stat cards
const StatCard = React.memo(({ icon: Icon, title, value, color }: { icon: React.ElementType, title: string, value: string | number, color: string }) => (
  <div className="bg-white rounded-lg shadow p-6">
    <div className="flex items-center">
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
));

// Memoized quick action buttons
const QuickActionButton = React.memo(({ icon: Icon, label, onClick }: { icon: React.ElementType, label: string, onClick: () => void }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
  >
    <Icon className="h-8 w-8 text-blue-600 mb-2" />
    <span className="text-sm font-medium text-gray-900">{label}</span>
  </button>
));

// Memoized activity item
const ActivityItem = React.memo(({ icon: Icon, title, description, timeAgo, iconBg }: { icon: React.ElementType, title: string, description: string, timeAgo: string, iconBg: string }) => (
  <div className="flex items-start">
    <div className="flex-shrink-0">
      <div className={`h-10 w-10 rounded-full ${iconBg} flex items-center justify-center`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
    <div className="ml-4">
      <p className="text-sm font-medium text-gray-900">{title}</p>
      <p className="text-sm text-gray-500">{description}</p>
      <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
    </div>
  </div>
));

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Memoized page title
  const getCurrentPageTitle = useCallback(() => {
    switch (location.pathname) {
      case '/admin/users':
        return 'User Management';
      case '/admin/content':
        return 'Content Management';
      case '/admin/uploads':
        return 'Upload Manager';
      case '/admin/moderation':
        return 'Content Moderation';
      case '/admin/tags':
        return 'Tag Management';
      case '/admin/analytics':
        return 'Analytics Dashboard';
      default:
        return 'Admin Dashboard';
    }
  }, [location.pathname]);

  // Memoized stats
  const stats = useMemo(() => [
    { icon: Users, title: 'Total Users', value: '1,248', color: 'bg-blue-100' },
    { icon: Upload, title: 'Pending Uploads', value: '24', color: 'bg-green-100' },
    { icon: AlertTriangle, title: 'Flagged Content', value: '8', color: 'bg-yellow-100' },
    { icon: BarChart3, title: 'Active Today', value: '342', color: 'bg-purple-100' }
  ], []);

  // Memoized quick actions
  const quickActions = useMemo(() => [
    { icon: Users, label: 'Manage Users', path: '/admin/users' },
    { icon: FileText, label: 'Content Manager', path: '/admin/content' },
    { icon: Upload, label: 'Upload Queue', path: '/admin/uploads' },
    { icon: Tag, label: 'Manage Tags', path: '/admin/tags' }
  ], []);

  // Memoized recent activities
  const recentActivities = useMemo(() => [
    { 
      icon: Users, 
      title: 'New user registered', 
      description: 'John Doe joined as a student in Addis Ababa chapter', 
      timeAgo: '2 minutes ago', 
      iconBg: 'bg-blue-100' 
    },
    { 
      icon: Upload, 
      title: 'Content uploaded', 
      description: 'Mathematics lesson uploaded by Teacher Smith', 
      timeAgo: '15 minutes ago', 
      iconBg: 'bg-green-100' 
    },
    { 
      icon: Shield, 
      title: 'Content flagged', 
      description: 'Forum post flagged for inappropriate content', 
      timeAgo: '1 hour ago', 
      iconBg: 'bg-yellow-100' 
    }
  ], []);

  // Memoized navigation handlers
  const handleNavigate = useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  const handleLogout = useCallback(() => {
    // Logout logic would go here
    navigate('/login');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - hidden on mobile, visible on desktop */}
      <div className="hidden md:block fixed inset-y-0 left-0 z-20">
        <AdminSidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-64">
        {/* Mobile header */}
        <div className="md:hidden bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
            <button
              onClick={() => handleNavigate('/')}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Home className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden md:block bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{getCurrentPageTitle()}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage platform content, users, and settings
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleNavigate('/')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </button>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Overview */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Stats cards */}
            {stats.map((stat, index) => (
              <StatCard 
                key={index}
                icon={stat.icon}
                title={stat.title}
                value={stat.value}
                color={stat.color}
              />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => (
                <QuickActionButton
                  key={index}
                  icon={action.icon}
                  label={action.label}
                  onClick={() => handleNavigate(action.path)}
                />
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <ActivityItem
                  key={index}
                  icon={activity.icon}
                  title={activity.title}
                  description={activity.description}
                  timeAgo={activity.timeAgo}
                  iconBg={activity.iconBg}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(AdminPanel);