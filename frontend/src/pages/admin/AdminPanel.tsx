import React from 'react';
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
import AdminSidebar from '../../components/admin/AdminSidebar';

const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCurrentPageTitle = () => {
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
  };

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
              onClick={() => navigate('/')}
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
                  onClick={() => navigate('/')}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </button>
                <button
                  onClick={() => {
                    // Logout logic would go here
                    navigate('/login');
                  }}
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
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                  <p className="text-2xl font-semibold text-gray-900">1,248</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Upload className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Pending Uploads</h3>
                  <p className="text-2xl font-semibold text-gray-900">24</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Flagged Content</h3>
                  <p className="text-2xl font-semibold text-gray-900">8</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Active Today</h3>
                  <p className="text-2xl font-semibold text-gray-900">342</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => navigate('/admin/users')}
                className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Users className="h-8 w-8 text-blue-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Manage Users</span>
              </button>
              
              <button
                onClick={() => navigate('/admin/content')}
                className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FileText className="h-8 w-8 text-green-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Content Manager</span>
              </button>
              
              <button
                onClick={() => navigate('/admin/uploads')}
                className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Upload className="h-8 w-8 text-purple-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Upload Queue</span>
              </button>
              
              <button
                onClick={() => navigate('/admin/tags')}
                className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Tag className="h-8 w-8 text-yellow-600 mb-2" />
                <span className="text-sm font-medium text-gray-900">Manage Tags</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">New user registered</p>
                  <p className="text-sm text-gray-500">John Doe joined as a student in Addis Ababa chapter</p>
                  <p className="text-xs text-gray-400 mt-1">2 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Content uploaded</p>
                  <p className="text-sm text-gray-500">Mathematics lesson uploaded by Teacher Smith</p>
                  <p className="text-xs text-gray-400 mt-1">15 minutes ago</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Content flagged</p>
                  <p className="text-sm text-gray-500">Forum post flagged for inappropriate content</p>
                  <p className="text-xs text-gray-400 mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;