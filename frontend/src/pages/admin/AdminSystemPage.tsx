import React, { useState, Suspense } from 'react';
import { BarChart2, Settings, ShieldIcon, Video, FileEdit } from 'lucide-react';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import SystemConfigDashboard from './config/SystemConfigDashboard';
import AdminActivityLogs from './AdminActivityLogs';

// Lazy load components
const MuxMigration = React.lazy(() => import('./MuxMigration'));
const LandingPageEditor = React.lazy(() => import('./LandingPageEditor'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full p-8">
    <div className="text-center">
      <div className="w-12 h-12 border-t-4 border-[#E74C3C] border-solid rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

const AdminSystemPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'config' | 'logs' | 'mux' | 'landing'>('analytics');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-4 p-3 sm:p-4 lg:p-6">
        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-4rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              <span className="text-sm">Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'config'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">System Config</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <ShieldIcon className="h-4 w-4" />
              <span className="text-sm">Activity Logs</span>
            </button>
            <button
              onClick={() => setActiveTab('mux')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'mux'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Video className="h-4 w-4" />
              <span className="text-sm">Mux Migration</span>
            </button>
            <button
              onClick={() => setActiveTab('landing')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'landing'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <FileEdit className="h-4 w-4" />
              <span className="text-sm">Landing Page</span>
            </button>
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'analytics' && (
              <div className="animate-in fade-in duration-300">
                <AnalyticsDashboard />
              </div>
            )}
            {activeTab === 'config' && (
              <div className="animate-in fade-in duration-300">
                <SystemConfigDashboard />
              </div>
            )}
            {activeTab === 'logs' && (
              <div className="animate-in fade-in duration-300">
                <AdminActivityLogs />
              </div>
            )}
            {activeTab === 'mux' && (
              <div className="animate-in fade-in duration-300 h-full">
                <Suspense fallback={<PageLoader />}>
                  <MuxMigration />
                </Suspense>
              </div>
            )}
            {activeTab === 'landing' && (
              <div className="animate-in fade-in duration-300">
                <Suspense fallback={<PageLoader />}>
                  <LandingPageEditor />
                </Suspense>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSystemPage;

