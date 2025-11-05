import { useState } from 'react';
import { Search, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface IconPickerProps {
  value?: string;
  onChange: (icon: string) => void;
  onClose: () => void;
}

// Popular icons for categories
const POPULAR_ICONS = [
  'BookOpen', 'Book', 'Library', 'GraduationCap', 'School',
  'Heart', 'Cross', 'Church', 'Users', 'User',
  'Star', 'Award', 'Trophy', 'Target', 'Compass',
  'Lightbulb', 'Sparkles', 'Flame', 'Sun', 'Moon',
  'Music', 'Palette', 'Camera', 'Video', 'Mic',
  'Globe', 'Map', 'MapPin', 'Navigation', 'Anchor',
  'Shield', 'Lock', 'Key', 'Crown', 'Gem',
  'Flower', 'Leaf', 'Tree', 'Sprout', 'Feather',
];

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIcon, setSelectedIcon] = useState(value || '');

  // Get all available Lucide icons
  const allIcons = Object.keys(LucideIcons).filter(
    key => key !== 'createLucideIcon' && typeof (LucideIcons as any)[key] === 'function'
  );

  // Filter icons based on search
  const filteredIcons = searchQuery
    ? allIcons.filter(icon =>
        icon.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : POPULAR_ICONS;

  const handleSelect = (icon: string) => {
    setSelectedIcon(icon);
  };

  const handleConfirm = () => {
    onChange(selectedIcon);
    onClose();
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="h-6 w-6" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Select Icon</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search icons..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          {!searchQuery && (
            <p className="text-sm text-gray-500 mt-2">
              Showing popular icons. Search to see all available icons.
            </p>
          )}
        </div>

        {/* Icon Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
            {filteredIcons.map(iconName => (
              <button
                key={iconName}
                onClick={() => handleSelect(iconName)}
                className={`p-3 rounded-lg border-2 transition-all hover:border-blue-500 hover:bg-blue-50 flex items-center justify-center ${
                  selectedIcon === iconName
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
                title={iconName}
              >
                {renderIcon(iconName)}
              </button>
            ))}
          </div>
          {filteredIcons.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No icons found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            {selectedIcon && (
              <>
                <span>Selected:</span>
                <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded">
                  {renderIcon(selectedIcon)}
                  <span className="font-medium">{selectedIcon}</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedIcon}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select Icon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
