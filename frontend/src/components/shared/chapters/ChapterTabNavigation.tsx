import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, BookOpen, Settings } from 'lucide-react';

interface ChapterTabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ChapterTabNavigation: React.FC<ChapterTabNavigationProps> = ({ activeTab, onTabChange }) => {
  const { t } = useTranslation();

  const tabs = [
    { id: 'browse', label: t('chapters.tabs.browse', 'Browse Chapters'), icon: Globe },
    { id: 'my-chapters', label: t('chapters.tabs.my_chapters', 'My Chapters'), icon: BookOpen },
    { id: 'manage', label: t('chapters.tabs.manage', 'Manage Chapter'), icon: Settings },
  ];

  return (
    <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`
            flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
            ${activeTab === tab.id
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }
          `}
        >
          <tab.icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-brand-primary' : ''}`} />
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ChapterTabNavigation;
