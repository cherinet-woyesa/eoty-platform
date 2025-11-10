import React, { useState, useCallback } from 'react';
import { 
  Settings, X, Grid, List, Eye, EyeOff, 
  Palette, Layout, Zap, Moon, Sun,
  Save, RotateCcw
} from 'lucide-react';

interface ViewCustomizerProps {
  activeView: string;
  onViewChange: (view: string) => void;
  onClose: () => void;
}

interface ViewOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  preview: string;
}

interface ThemeOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  class: string;
}

const ViewCustomizer: React.FC<ViewCustomizerProps> = ({
  activeView,
  onViewChange,
  onClose
}) => {
  const [selectedTheme, setSelectedTheme] = useState('light');
  const [compactMode, setCompactMode] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const viewOptions: ViewOption[] = [
    {
      id: 'overview',
      name: 'Overview',
      description: 'Complete dashboard with all components',
      icon: <Grid className="h-5 w-5" />,
      preview: 'Complete view with stats, courses, and activities'
    },
    {
      id: 'compact',
      name: 'Compact',
      description: 'Dense layout for power users',
      icon: <List className="h-5 w-5" />,
      preview: 'Condensed layout with essential information'
    },
    {
      id: 'focus',
      name: 'Focus Mode',
      description: 'Minimal distractions for deep work',
      icon: <Eye className="h-5 w-5" />,
      preview: 'Clean interface with focus on current tasks'
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Only essential information',
      icon: <EyeOff className="h-5 w-5" />,
      preview: 'Barebones view with core metrics only'
    }
  ];

  const themeOptions: ThemeOption[] = [
    {
      id: 'light',
      name: 'Light',
      description: 'Clean and bright interface',
      icon: <Sun className="h-4 w-4" />,
      class: 'bg-white text-gray-900'
    },
    {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes in low light',
      icon: <Moon className="h-4 w-4" />,
      class: 'bg-gray-900 text-white'
    },
    {
      id: 'blue',
      name: 'Blue',
      description: 'Professional blue theme',
      icon: <Palette className="h-4 w-4" />,
      class: 'bg-blue-900 text-white'
    },
    {
      id: 'green',
      name: 'Green',
      description: 'Calming green theme',
      icon: <Palette className="h-4 w-4" />,
      class: 'bg-green-800 text-white'
    }
  ];

  const handleSave = useCallback(() => {
    // Save preferences to localStorage or API
    const preferences = {
      view: activeView,
      theme: selectedTheme,
      compactMode,
      highContrast,
      animationsEnabled
    };
    
    localStorage.setItem('dashboard_preferences', JSON.stringify(preferences));
    onClose();
  }, [activeView, selectedTheme, compactMode, highContrast, animationsEnabled, onClose]);

  const handleReset = useCallback(() => {
    setSelectedTheme('light');
    setCompactMode(false);
    setHighContrast(false);
    setAnimationsEnabled(true);
    onViewChange('overview');
  }, [onViewChange]);

  const handleApplyView = useCallback((viewId: string) => {
    onViewChange(viewId);
  }, [onViewChange]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Dashboard Customization</h2>
              <p className="text-sm text-gray-600">Personalize your learning dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-8rem)]">
          {/* Navigation */}
          <div className="lg:w-64 border-r border-gray-200 bg-gray-50 p-4">
            <nav className="space-y-2">
              <button className="w-full text-left px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg">
                View Layout
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                Theme & Colors
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                Accessibility
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                Notifications
              </button>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* View Layout Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Layout className="h-5 w-5 mr-2 text-blue-600" />
                View Layout
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {viewOptions.map((option) => (
                  <div
                    key={option.id}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      activeView === option.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => handleApplyView(option.id)}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        activeView === option.id
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {option.icon}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{option.name}</div>
                        <div className="text-sm text-gray-600">{option.description}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                      {option.preview}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Theme Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Palette className="h-5 w-5 mr-2 text-purple-600" />
                Theme & Colors
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {themeOptions.map((theme) => (
                  <div
                    key={theme.id}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      selectedTheme === theme.id
                        ? 'border-purple-500 ring-2 ring-purple-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedTheme(theme.id)}
                  >
                    <div className={`${theme.class} rounded-lg p-3 text-center mb-2`}>
                      <div className="flex justify-center mb-2">
                        {theme.icon}
                      </div>
                      <div className="text-sm font-medium">{theme.name}</div>
                    </div>
                    <div className="text-xs text-gray-600 text-center">
                      {theme.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accessibility Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="h-5 w-5 mr-2 text-orange-600" />
                Accessibility
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Compact Mode</div>
                    <div className="text-sm text-gray-600">Reduce spacing for more content</div>
                  </div>
                  <button
                    onClick={() => setCompactMode(!compactMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      compactMode ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        compactMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">High Contrast</div>
                    <div className="text-sm text-gray-600">Increase color contrast for better readability</div>
                  </div>
                  <button
                    onClick={() => setHighContrast(!highContrast)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      highContrast ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        highContrast ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">Animations</div>
                    <div className="text-sm text-gray-600">Enable smooth transitions and animations</div>
                  </div>
                  <button
                    onClick={() => setAnimationsEnabled(!animationsEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      animationsEnabled ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        animationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Preview</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900 mb-1">12</div>
                  <div className="text-sm text-gray-600">Courses</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900 mb-1">45</div>
                  <div className="text-sm text-gray-600">Lessons</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-900 mb-1">7</div>
                  <div className="text-sm text-gray-600">Days Streak</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-3 text-center">
                This preview shows how your dashboard will look with current settings
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-700 transition-colors"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ViewCustomizer);