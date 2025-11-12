import React, { useState, useCallback } from 'react';
import { Plus, Video, BookOpen, Users, BarChart, Zap, Settings, FileText } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useHotkeys } from '@/hooks/useHotkeys';

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  action: () => void;
  shortcut?: string[];
  roles?: string[];
  color: string;
}

const QuickActions: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isTeacher = user?.role === 'teacher' || user?.role === 'chapter_admin' || user?.role === 'platform_admin';
  const isAdmin = user?.role === 'platform_admin' || user?.role === 'chapter_admin';

  const quickActions: QuickAction[] = [
    {
      id: 'new-course',
      icon: <BookOpen className="h-4 w-4" />,
      label: 'New Course',
      description: 'Create a new course',
      action: () => console.log('Create new course'),
      shortcut: ['ctrl', 'shift', 'c'],
      roles: ['teacher', 'chapter_admin', 'platform_admin'],
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'record-video',
      icon: <Video className="h-4 w-4" />,
      label: 'Record Video',
      description: 'Record a new lesson',
      action: () => console.log('Record video'),
      shortcut: ['ctrl', 'shift', 'r'],
      roles: ['teacher', 'chapter_admin', 'platform_admin'],
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'new-user',
      icon: <Users className="h-4 w-4" />,
      label: 'Add User',
      description: 'Invite new user',
      action: () => console.log('Add user'),
      shortcut: ['ctrl', 'shift', 'u'],
      roles: ['chapter_admin', 'platform_admin'],
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'analytics',
      icon: <BarChart className="h-4 w-4" />,
      label: 'Analytics',
      description: 'View platform analytics',
      action: () => console.log('View analytics'),
      shortcut: ['ctrl', 'shift', 'a'],
      roles: ['chapter_admin', 'platform_admin'],
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'new-content',
      icon: <FileText className="h-4 w-4" />,
      label: 'New Content',
      description: 'Upload learning materials',
      action: () => console.log('Upload content'),
      roles: ['teacher', 'chapter_admin', 'platform_admin'],
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'settings',
      icon: <Settings className="h-4 w-4" />,
      label: 'Settings',
      description: 'Platform settings',
      action: () => console.log('Open settings'),
      shortcut: ['ctrl', ','],
      roles: ['platform_admin'],
      color: 'from-gray-500 to-gray-600'
    }
  ];

  const filteredActions = quickActions.filter(action => 
    !action.roles || action.roles.includes(user?.role || '')
  );

  // Register keyboard shortcuts
  useHotkeys(
    filteredActions
      .filter(action => action.shortcut)
      .map(action => ({
        keys: action.shortcut!,
        callback: action.action,
        description: action.label
      }))
  );

  const handleActionClick = useCallback((action: QuickAction) => {
    action.action();
    setIsOpen(false);
  }, []);

  const handleKeyPress = useCallback((event: React.KeyboardEvent, action: QuickAction) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActionClick(action);
    }
  }, [handleActionClick]);

  const formatShortcut = (shortcut: string[] | undefined) => {
    if (!shortcut) return null;
    return shortcut.map(key => 
      key === 'ctrl' ? '⌘' : key.charAt(0).toUpperCase() + key.slice(1)
    ).join('+');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden lg:flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-label="Quick actions"
        aria-expanded={isOpen}
      >
        <Zap className="h-4 w-4" />
        <span>Quick Actions</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200/60 py-2 z-50 animate-in slide-in-from-top-2">
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
            <p className="text-xs text-gray-500 mt-1">
              Quickly access common tasks
            </p>
          </div>

          {/* Actions List */}
          <div className="py-1">
            {filteredActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                onKeyDown={(e) => handleKeyPress(e, action)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors duration-150 group focus:outline-none focus:bg-gray-50"
                role="menuitem"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${action.color} flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow`}>
                      {action.icon}
                    </div>
                    <div className="text-left">
                      <div className="font-medium text-gray-900 group-hover:text-gray-700">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-500 group-hover:text-gray-600">
                        {action.description}
                      </div>
                    </div>
                  </div>
                  {action.shortcut && (
                    <kbd className="hidden sm:inline-flex items-center px-2 py-1 text-xs font-mono text-gray-400 bg-gray-100 rounded border border-gray-300">
                      {formatShortcut(action.shortcut)}
                    </kbd>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
            <p className="text-xs text-gray-500 text-center">
              Use keyboard shortcuts for faster access
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(QuickActions);