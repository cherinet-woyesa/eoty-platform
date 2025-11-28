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
        {/* Tab Navigation */}
        <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
          <nav className="flex border-b border-gray-200 flex-shrink-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 font-medium transition-all border-b-2 whitespace-nowrap text-sm min-w-[120px] ${
                  activeTab === tab.id
                    ? 'border-[#27AE60] text-[#27AE60] bg-[#27AE60]/5'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
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
