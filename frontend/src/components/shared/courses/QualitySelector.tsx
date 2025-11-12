import * as React from 'react';
import { Settings, Check } from 'lucide-react';

export interface QualityLevel {
  index: number;
  height: number;
  bitrate: number;
  label: string;
}

interface QualitySelectorProps {
  levels: QualityLevel[];
  currentLevel: number;
  onLevelChange: (levelIndex: number) => void;
}

const QualitySelector: React.FC<QualitySelectorProps> = ({
  levels,
  currentLevel,
  onLevelChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleLevelSelect = (levelIndex: number) => {
    onLevelChange(levelIndex);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
        title="Quality"
        aria-label="Quality settings"
      >
        <Settings className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700">
            <span className="text-white text-sm font-semibold">Quality</span>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {/* Auto option */}
            <button
              onClick={() => handleLevelSelect(-1)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                currentLevel === -1 ? 'text-blue-400' : 'text-white'
              }`}
            >
              <span>Auto</span>
              {currentLevel === -1 && <Check className="h-4 w-4" />}
            </button>

            {/* Available quality levels */}
            {levels.map((level) => (
              <button
                key={level.index}
                onClick={() => handleLevelSelect(level.index)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                  currentLevel === level.index ? 'text-blue-400' : 'text-white'
                }`}
              >
                <span>{level.label}</span>
                {currentLevel === level.index && <Check className="h-4 w-4" />}
              </button>
            ))}

            {/* Empty state */}
            {levels.length === 0 && (
              <div className="px-3 py-4 text-center text-gray-400 text-xs">
                No quality options available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QualitySelector;
