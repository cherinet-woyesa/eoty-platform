import * as React from 'react';
import { Subtitles, Check } from 'lucide-react';
import type { SubtitleTrack } from '@/services/api/subtitles';

interface SubtitleSelectorProps {
  tracks: SubtitleTrack[];
  currentTrack: string | null;
  onTrackChange: (trackId: string | null) => void;
}

const SubtitleSelector: React.FC<SubtitleSelectorProps> = ({
  tracks,
  currentTrack,
  onTrackChange,
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

  const handleTrackSelect = (trackId: string | null) => {
    onTrackChange(trackId);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full text-white hover:bg-white/20 transition-colors"
        title="Subtitles"
        aria-label="Subtitle settings"
      >
        <Subtitles className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-700">
            <span className="text-white text-sm font-semibold">Subtitles</span>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {/* Off option */}
            <button
              onClick={() => handleTrackSelect(null)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                !currentTrack ? 'text-blue-400' : 'text-white'
              }`}
            >
              <span>Off</span>
              {!currentTrack && <Check className="h-4 w-4" />}
            </button>

            {/* Available subtitle tracks */}
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => handleTrackSelect(track.id)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors flex items-center justify-between ${
                  currentTrack === track.id ? 'text-blue-400' : 'text-white'
                }`}
              >
                <span>{track.language}</span>
                {currentTrack === track.id && <Check className="h-4 w-4" />}
              </button>
            ))}

            {/* Empty state */}
            {tracks.length === 0 && (
              <div className="px-3 py-4 text-center text-gray-400 text-xs">
                No subtitles available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubtitleSelector;
