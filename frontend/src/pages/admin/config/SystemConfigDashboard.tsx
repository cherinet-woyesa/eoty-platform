import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layers,
  Target,
  Clock,
  Tag,
  BookOpen,
  ChevronRight,
  Settings
} from 'lucide-react';
import CategoryManagement from './CategoryManagement';
import LevelManagement from './LevelManagement';
import DurationManagement from './DurationManagement';
import TagManagement from './TagManagement';
import ChapterManagement from './ChapterManagement';

export const SystemConfigDashboard = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'categories' | 'levels' | 'durations' | 'tags' | 'chapters'>('categories');

  const tabs = [
    {
      id: 'categories' as const,
      label: t('system.tabs.categories', 'Categories'),
      description: t('system.tabs.categories_desc', 'Manage course categories and hierarchical structures'),
      icon: <Layers className="h-4 w-4" />,
      component: CategoryManagement
    },
    {
      id: 'levels' as const,
      label: t('system.tabs.levels', 'Levels'),
      description: t('system.tabs.levels_desc', 'Define difficulty levels for courses'),
      icon: <Target className="h-4 w-4" />,
      component: LevelManagement
    },
    {
      id: 'durations' as const,
      label: t('system.tabs.durations', 'Durations'),
      description: t('system.tabs.durations_desc', 'Configure standard course duration options'),
      icon: <Clock className="h-4 w-4" />,
      component: DurationManagement
    },
    {
      id: 'tags' as const,
      label: t('system.tabs.tags', 'Tags'),
      description: t('system.tabs.tags_desc', 'Manage content tags for improved discoverability'),
      icon: <Tag className="h-4 w-4" />,
      component: TagManagement
    },
    {
      id: 'chapters' as const,
      label: t('system.tabs.chapters', 'Chapters'),
      description: t('system.tabs.chapters_desc', 'Organize local chapters and jurisdictions'),
      icon: <BookOpen className="h-4 w-4" />,
      component: ChapterManagement
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || CategoryManagement;
  const activeTabDetails = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="w-full h-full p-6 bg-gray-50/50">
      <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 bg-slate-50 border-r border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="w-6 h-6 text-indigo-600" />
              {t('system.title', 'Settings')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{t('system.subtitle', 'Platform configuration')}</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
              {t('system.sidebar.taxonomies', 'Taxonomies')}
            </div>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 group ${activeTab === tab.id
                  ? 'bg-white shadow-sm border border-gray-200 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-100/80 hover:text-gray-900'
                  }`}
              >
                <div className={`p-2 rounded-md transition-colors ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm'
                  }`}>
                  {tab.icon}
                </div>
                <div className="flex-1 text-left">
                  <span className="block text-gray-900">{tab.label}</span>
                </div>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 text-indigo-600" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <div className="border-b border-gray-200 px-8 py-6 bg-white">
            <h1 className="text-2xl font-bold text-gray-900">{activeTabDetails?.label}</h1>
            <p className="text-gray-500 mt-1">{activeTabDetails?.description}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            <div className={`animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-4xl`}>
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemConfigDashboard;
