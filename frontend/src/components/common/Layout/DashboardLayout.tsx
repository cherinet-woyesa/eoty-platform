import React from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import AdminSidebar from '../../admin/AdminSidebar';
import { useAuth } from '../../../context/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAdminUser = user?.role === 'chapter_admin' || user?.role === 'platform_admin';

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Show admin sidebar for admin routes, regular sidebar for others */}
      {isAdminRoute && isAdminUser ? (
        <div className="w-64 bg-white border-r border-gray-200">
          <AdminSidebar />
        </div>
      ) : (
        <div className="w-64 bg-white border-r border-gray-200">
          <Sidebar />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;