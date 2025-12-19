import React, { useState, Suspense } from 'react';
import { BarChart2, Settings, ShieldIcon, Video, FileEdit, Book, LifeBuoy } from 'lucide-react';
import AnalyticsDashboard from '@/components/admin/analytics/AnalyticsDashboard';
import SystemConfigDashboard from './config/SystemConfigDashboard';
import AdminActivityLogs from './AdminActivityLogs';
import SupportTicketsTab from '@/components/admin/system/SupportTicketsTab';
import LoadingSpinner from '@/components/common/LoadingSpinner';

// Lazy load components
const LandingPageEditor = React.lazy(() => import('./LandingPageEditor'));
const KnowledgeBaseManager = React.lazy(() => import('./KnowledgeBaseManager'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-full p-8">
    <LoadingSpinner size="lg" text="Loading..." variant="logo" />
  </div>
);

const AdminSystemPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'config' | 'logs' | 'landing' | 'knowledge' | 'support'>('landing');

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-4 p-3 sm:p-4 lg:p-6">
        {/* Tabs */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-4rem)]">
          <nav className="flex space-x-2 p-2 bg-white border-b border-slate-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('landing')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === 'landing'
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              <FileEdit className="h-4 w-4" />
              <span className="text-sm">Landing Page</span>
            </button>
            <button
              onClick={() => setActiveTab('knowledge')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === 'knowledge'
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              <Book className="h-4 w-4" />
              <span className="text-sm">Knowledge Base</span>
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === 'config'
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm">System Config</span>
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === 'logs'
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              <ShieldIcon className="h-4 w-4" />
              <span className="text-sm">Activity Logs</span>
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === 'analytics'
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              <BarChart2 className="h-4 w-4" />
              <span className="text-sm">Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`flex items-center justify-center gap-2 px-4 py-3 font-semibold transition-all border-b-2 whitespace-nowrap ${activeTab === 'support'
                  ? 'border-brand-primary text-brand-primary bg-brand-primary/5'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
              <LifeBuoy className="h-4 w-4" />
              <span className="text-sm">Support Tickets</span>
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
            {activeTab === 'support' && (
              <div className="animate-in fade-in duration-300 h-full">
                <SupportTicketsTab />
              </div>
            )}
            {activeTab === 'landing' && (
              <div className="animate-in fade-in duration-300 h-full">
                <Suspense fallback={<PageLoader />}>
                  <LandingPageEditor />
                </Suspense>
              </div>
            )}
            {activeTab === 'knowledge' && (
              <div className="animate-in fade-in duration-300 h-full">
                <Suspense fallback={<PageLoader />}>
                  <KnowledgeBaseManager />
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

