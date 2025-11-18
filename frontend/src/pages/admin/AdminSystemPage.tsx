import React, { useState, Suspense } from 'react';
import { BarChart2, Settings, ShieldIcon, Video, FileEdit } from 'lucide-react';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import SystemConfigDashboard from './config/SystemConfigDashboard';
import AdminActivityLogs from './AdminActivityLogs';
import LandingPageEditor from '@/components/admin/LandingPageEditor';

// Lazy load Mux Migration
const MuxMigration = React.lazy(() => import('./MuxMigration'));

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
      <div className="w-full space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Settings className="h-8 w-8 text-[#E74C3C]" />
            System Management
          </h1>
          <p className="text-gray-600">Analytics, configuration, logs, and system tools</p>
        </div>

        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <BarChart2 className="h-5 w-5" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'config'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Settings className="h-5 w-5" />
              <span>System Config</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'logs'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <ShieldIcon className="h-5 w-5" />
              <span>Activity Logs</span>
            </button>
            <button
              onClick={() => setActiveTab('mux')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'mux'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Video className="h-5 w-5" />
              <span>Mux Migration</span>
            </button>
            <button
              onClick={() => setActiveTab('landing')}
              className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all border-b-2 whitespace-nowrap ${
                activeTab === 'landing'
                  ? 'border-[#E74C3C] text-[#E74C3C] bg-[#E74C3C]/5'
                  : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <FileEdit className="h-5 w-5" />
              <span>Landing Page</span>
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
                <LandingPageEditor />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSystemPage;

