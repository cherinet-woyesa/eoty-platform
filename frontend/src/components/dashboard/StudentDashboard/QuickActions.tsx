import React, { useCallback, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, Award, MessageCircle, Activity, Brain, Target, Clock, Star,
  Settings, Search, Users, FileText, Video, Download, Bell, HelpCircle,
  Plus, TrendingUp, Calendar, Bookmark, Zap, Filter, Grid, List
} from 'lucide-react';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  href: string;
  color: string;
  bgColor: string;
  badge?: string;
  isNew?: boolean;
  isPro?: boolean;
  shortcut?: string;
  category?: 'learning' | 'community' | 'tools' | 'resources';
}

interface QuickActionsProps {
  onActionClick?: (actionId: string, action: QuickAction) => void;
  recentActions?: string[];
  pinnedActions?: string[];
}

const QuickActions: React.FC<QuickActionsProps> = ({ 
  onActionClick,
  recentActions = [],
  pinnedActions = []
}) => {
  const location = useLocation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'learning' | 'community' | 'tools' | 'resources'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const allActions: QuickAction[] = useMemo(() => [
    {
      id: 'my-courses',
      icon: <BookOpen className="h-5 w-5" />,
      label: 'My Courses',
      description: 'Continue learning',
      href: '/courses',
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 hover:bg-blue-100',
      category: 'learning',
      shortcut: 'C'
    },
    {
      id: 'ai-assistant',
      icon: <Activity className="h-5 w-5" />,
      label: 'AI Assistant',
      description: 'Get help & answers',
      href: '/ai-assistant',
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50 hover:bg-purple-100',
      category: 'tools',
      isNew: true,
      shortcut: 'A'
    },
    {
      id: 'achievements',
      icon: <Award className="h-5 w-5" />,
      label: 'Achievements',
      description: 'View badges & rewards',
      href: '/achievements',
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50 hover:bg-green-100',
      category: 'learning',
      badge: '3 new',
      shortcut: 'B'
    },
    {
      id: 'discussions',
      icon: <MessageCircle className="h-5 w-5" />,
      label: 'Discussions',
      description: 'Ask questions & share',
      href: '/forums',
      color: 'from-indigo-500 to-indigo-600',
      bgColor: 'bg-indigo-50 hover:bg-indigo-100',
      category: 'community',
      shortcut: 'D'
    },
    {
      id: 'study-paths',
      icon: <Brain className="h-5 w-5" />,
      label: 'Study Paths',
      description: 'Learning routes',
      href: '/learning-paths',
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 hover:bg-orange-100',
      category: 'learning',
      shortcut: 'P'
    },
    {
      id: 'progress',
      icon: <Target className="h-5 w-5" />,
      label: 'Progress',
      description: 'Track learning',
      href: '/progress',
      color: 'from-pink-500 to-pink-600',
      bgColor: 'bg-pink-50 hover:bg-pink-100',
      category: 'learning',
      shortcut: 'G'
    },
    {
      id: 'resources',
      icon: <FileText className="h-5 w-5" />,
      label: 'Resources',
      description: 'Notes & materials',
      href: '/resources',
      color: 'from-teal-500 to-teal-600',
      bgColor: 'bg-teal-50 hover:bg-teal-100',
      category: 'resources',
      shortcut: 'R'
    },
    {
      id: 'community',
      icon: <Users className="h-5 w-5" />,
      label: 'Community',
      description: 'Connect with peers',
      href: '/community',
      color: 'from-cyan-500 to-cyan-600',
      bgColor: 'bg-cyan-50 hover:bg-cyan-100',
      category: 'community',
      shortcut: 'M'
    },
    {
      id: 'video-library',
      icon: <Video className="h-5 w-5" />,
      label: 'Video Library',
      description: 'Tutorials & lectures',
      href: '/videos',
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50 hover:bg-red-100',
      category: 'resources',
      isPro: true,
      shortcut: 'V'
    },
    {
      id: 'downloads',
      icon: <Download className="h-5 w-5" />,
      label: 'Downloads',
      description: 'Offline materials',
      href: '/downloads',
      color: 'from-gray-500 to-gray-600',
      bgColor: 'bg-gray-50 hover:bg-gray-100',
      category: 'resources',
      shortcut: 'L'
    },
    {
      id: 'notifications',
      icon: <Bell className="h-5 w-5" />,
      label: 'Notifications',
      description: 'Updates & alerts',
      href: '/notifications',
      color: 'from-yellow-500 to-yellow-600',
      bgColor: 'bg-yellow-50 hover:bg-yellow-100',
      category: 'tools',
      badge: '5',
      shortcut: 'N'
    },
    {
      id: 'settings',
      icon: <Settings className="h-5 w-5" />,
      label: 'Settings',
      description: 'Preferences & account',
      href: '/settings',
      color: 'from-gray-600 to-gray-700',
      bgColor: 'bg-gray-50 hover:bg-gray-100',
      category: 'tools',
      shortcut: 'S'
    }
  ], []);

  const filteredActions = useMemo(() => {
    let filtered = allActions;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(action => action.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(action =>
        action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by pinned and recent
    return filtered.sort((a, b) => {
      const aPinned = pinnedActions.includes(a.id);
      const bPinned = pinnedActions.includes(b.id);
      const aRecent = recentActions.includes(a.id);
      const bRecent = recentActions.includes(b.id);

      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [allActions, selectedCategory, searchQuery, pinnedActions, recentActions]);

  const categories = useMemo(() => [
    { id: 'all', label: 'All', count: allActions.length, icon: <Grid className="h-4 w-4" /> },
    { id: 'learning', label: 'Learning', count: allActions.filter(a => a.category === 'learning').length, icon: <BookOpen className="h-4 w-4" /> },
    { id: 'community', label: 'Community', count: allActions.filter(a => a.category === 'community').length, icon: <Users className="h-4 w-4" /> },
    { id: 'tools', label: 'Tools', count: allActions.filter(a => a.category === 'tools').length, icon: <Settings className="h-4 w-4" /> },
    { id: 'resources', label: 'Resources', count: allActions.filter(a => a.category === 'resources').length, icon: <FileText className="h-4 w-4" /> }
  ], [allActions]);

  const handleActionClick = useCallback((action: QuickAction) => {
    onActionClick?.(action.id, action);
    
    // Analytics tracking
    console.log(`Quick action clicked: ${action.label}`, {
      actionId: action.id,
      category: action.category,
      timestamp: new Date().toISOString()
    });
  }, [onActionClick]);

  const handleKeyPress = useCallback((action: QuickAction, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleActionClick(action);
    }
  }, [handleActionClick]);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) return; // Ignore modifier keys
      
      const action = allActions.find(a => 
        a.shortcut && a.shortcut.toLowerCase() === e.key.toLowerCase()
      );
      
      if (action) {
        e.preventDefault();
        handleActionClick(action);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [allActions, handleActionClick]);

  const ActionCard: React.FC<{ action: QuickAction }> = ({ action }) => (
    <Link
      to={action.href}
      onClick={() => handleActionClick(action)}
      onKeyDown={(e) => handleKeyPress(action, e)}
      className={`flex items-center p-4 rounded-xl border border-gray-200 transition-all duration-200 group relative overflow-hidden ${
        viewMode === 'grid' 
          ? 'flex-col text-center hover:shadow-md hover:scale-105' 
          : 'flex-row text-left hover:shadow-sm hover:bg-gray-50'
      } ${action.bgColor}`}
      tabIndex={0}
      aria-label={`${action.label} - ${action.description}`}
    >
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-0 group-hover:opacity-5 transition-opacity duration-200`} />
      
      {/* Icon */}
      <div className={`${viewMode === 'grid' ? 'mb-3' : 'mr-4'} relative`}>
        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
          <div className="text-white">
            {action.icon}
          </div>
        </div>
        
        {/* Badges */}
        <div className="absolute -top-1 -right-1 flex space-x-1">
          {action.isNew && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
              New
            </span>
          )}
          {action.isPro && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500 text-white">
              Pro
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 min-w-0 ${viewMode === 'grid' ? 'w-full' : ''}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="font-medium text-gray-900 group-hover:text-gray-700 text-sm sm:text-base">
            {action.label}
          </div>
          {action.badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {action.badge}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 group-hover:text-gray-600 line-clamp-2">
          {action.description}
        </div>
        
        {/* Shortcut hint for list view */}
        {viewMode === 'list' && action.shortcut && (
          <div className="mt-2 text-xs text-gray-400">
            Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">{action.shortcut}</kbd>
          </div>
        )}
      </div>

      {/* Quick access indicator for recent/pinned */}
      <div className="absolute top-2 right-2 flex space-x-1">
        {pinnedActions.includes(action.id) && (
          <Bookmark className="h-3 w-3 text-yellow-500 fill-current" />
        )}
        {recentActions.includes(action.id) && !pinnedActions.includes(action.id) && (
          <Clock className="h-3 w-3 text-blue-500" />
        )}
      </div>
    </Link>
  );

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <Star className="h-5 w-5 mr-2 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            <Zap className="h-3 w-3" />
            <span>Press keys for quick access</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-40 lg:w-48"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            )}
          </div>

          {/* View Toggle */}
          <button
            onClick={toggleViewMode}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title={viewMode === 'grid' ? 'List View' : 'Grid View'}
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id as any)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedCategory === category.id
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {category.icon}
            <span>{category.label}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              selectedCategory === category.id
                ? 'bg-blue-200 text-blue-800'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Actions Grid/List */}
      {filteredActions.length > 0 ? (
        <div className={
          viewMode === 'grid' 
            ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4'
            : 'space-y-2'
        }>
          {filteredActions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No actions found</h4>
          <p className="text-gray-600 mb-4">
            {searchQuery 
              ? `No actions match "${searchQuery}"`
              : 'No actions available in this category'
            }
          </p>
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Search
            </button>
          )}
        </div>
      )}

      {/* Today's Focus */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-gray-900 flex items-center">
            <Clock className="h-4 w-4 mr-2 text-blue-500" />
            Today's Focus
          </h4>
          <Link
            to="/schedule"
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
          >
            <Calendar className="h-3 w-3 mr-1" />
            View Schedule
          </Link>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-sm font-bold text-blue-600">2</div>
            <div className="text-xs text-blue-600 font-medium">Lessons</div>
            <div className="text-xs text-blue-500 mt-1">30 min each</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-sm font-bold text-green-600">30m</div>
            <div className="text-xs text-green-600 font-medium">Study Time</div>
            <div className="text-xs text-green-500 mt-1">Completed: 15m</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-sm font-bold text-purple-600">1</div>
            <div className="text-xs text-purple-600 font-medium">Quiz</div>
            <div className="text-xs text-purple-500 mt-1">Due today</div>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div className="text-sm font-bold text-orange-600">85%</div>
            <div className="text-xs text-orange-600 font-medium">Daily Goal</div>
            <div className="text-xs text-orange-500 mt-1">Almost there!</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Daily Progress</span>
            <span>85%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: '85%' }}
            />
          </div>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-start space-x-2">
          <HelpCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-gray-600">
            <span className="font-medium">Tip:</span> Use keyboard shortcuts for faster navigation. 
            Press the corresponding key for each action.
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuickActions);