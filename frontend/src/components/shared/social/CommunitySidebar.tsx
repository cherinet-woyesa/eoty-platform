import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Layout, User, Bookmark, Hash, 
  MessageSquare, Image as ImageIcon, FileText, 
  HelpCircle, TrendingUp
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
  activeFilter: string;
  onFilterChange: (filter: any) => void;
}

const CommunitySidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  activeFilter,
  onFilterChange
}) => {
  const { t } = useTranslation();

  const navItems = [
    { id: 'feed', label: t('community_hub.community_feed'), icon: Layout },
    { id: 'my-posts', label: t('community_hub.my_posts'), icon: User },
    { id: 'trending', label: t('community_hub.trending'), icon: TrendingUp },
    // { id: 'saved', label: t('community_hub.saved'), icon: Bookmark }, // Future feature
  ];

  const topics = [
    { id: 'all', label: t('community_hub.all_topics'), icon: Hash },
    { id: 'discussion', label: t('community_hub.discussion'), icon: MessageSquare },
    { id: 'showcase', label: t('community_hub.showcase'), icon: ImageIcon },
    { id: 'article', label: t('community_hub.articles'), icon: FileText },
    { id: 'qa', label: t('community_hub.q_and_a'), icon: HelpCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Main Navigation */}
      <div className="bg-[#1e1b4b] rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">{t('common.menu') || 'Menu'}</h3>
        </div>
        <nav className="p-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-white text-[#1e1b4b]'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <item.icon className={`h-5 w-5 ${activeTab === item.id ? 'text-[#1e1b4b]' : 'text-white/70'}`} />
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Topics / Filters */}
      <div className="bg-[#1e1b4b] rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-xs font-semibold text-white/70 uppercase tracking-wider">Topics</h3>
        </div>
        <nav className="p-2 space-y-1">
          {topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => onFilterChange(topic.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === topic.id
                  ? 'bg-white text-[#1e1b4b]'
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              <topic.icon className={`h-4 w-4 ${activeFilter === topic.id ? 'text-[#1e1b4b]' : 'text-white/70'}`} />
              {topic.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};

export default CommunitySidebar;
