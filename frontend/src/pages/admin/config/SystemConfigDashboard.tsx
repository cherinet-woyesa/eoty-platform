import { useState } from 'react';
import {
  Layers,
  Target,
  Clock,
  Tag,
  BookOpen
} from 'lucide-react';
import CategoryManagement from './CategoryManagement';
import LevelManagement from './LevelManagement';
import DurationManagement from './DurationManagement';
import TagManagement from './TagManagement';
import ChapterManagement from './ChapterManagement';
import { brandColors } from '@/theme/brand';

export const SystemConfigDashboard = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'levels' | 'durations' | 'tags' | 'chapters'>('categories');

  const tabs = [
    {
      id: 'categories' as const,
      label: 'Categories',
      icon: <Layers className="h-4 w-4" />,
      component: CategoryManagement
    },
    {
      id: 'levels' as const,
      label: 'Levels',
      icon: <Target className="h-4 w-4" />,
      component: LevelManagement
    },
    {
      id: 'durations' as const,
      label: 'Durations',
      icon: <Clock className="h-4 w-4" />,
      component: DurationManagement
    },
    {
      id: 'tags' as const,
      label: 'Tags',
      icon: <Tag className="h-4 w-4" />,
      component: TagManagement
    },
    {
      id: 'chapters' as const,
      label: 'Chapters',
      icon: <BookOpen className="h-4 w-4" />,
      component: ChapterManagement
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || CategoryManagement;

  return (
    <div className="w-full h-full">
      <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">System Configuration</h2>
            <p className="text-sm text-gray-500">Manage taxonomies and chapter structure used across the platform.</p>
          </div>
          <div className="text-xs text-gray-400">Brand aligned</div>
        </div>
        {/* Tab Navigation */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm min-w-[120px] ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
                style={
                  activeTab === tab.id
                    ? { backgroundColor: brandColors.primaryHex, borderColor: brandColors.primaryHex }
                    : undefined
                }
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="animate-in fade-in duration-300 p-3">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};




export default SystemConfigDashboard;
