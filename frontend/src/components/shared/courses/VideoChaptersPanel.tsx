import React, { useState, useEffect } from 'react';
import { List, Clock, Play, ChevronRight } from 'lucide-react';
import { videoChaptersApi, type VideoChapter } from '@/services/api';
import { formatTime } from '@/utils/formatters';

interface VideoChaptersPanelProps {
  lessonId: string;
  currentTime: number;
  onSeekTo: (timestamp: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

const VideoChaptersPanel: React.FC<VideoChaptersPanelProps> = ({
  lessonId,
  currentTime,
  onSeekTo,
  isOpen,
  onClose
}) => {
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeChapter, setActiveChapter] = useState<VideoChapter | null>(null);

  // Load chapters
  useEffect(() => {
    if (isOpen && lessonId) {
      loadChapters();
    }
  }, [isOpen, lessonId]);

  // Update active chapter based on current time
  useEffect(() => {
    if (chapters.length > 0) {
      const current = chapters.find(
        (chapter) =>
          currentTime >= chapter.start_time &&
          (!chapter.end_time || currentTime <= chapter.end_time)
      ) || chapters.find((chapter) => currentTime >= chapter.start_time && !chapter.end_time);
      
      setActiveChapter(current || null);
    }
  }, [currentTime, chapters]);

  const loadChapters = async () => {
    setLoading(true);
    try {
      const data = await videoChaptersApi.getChapters(lessonId);
      setChapters(data);
    } catch (error) {
      console.error('Failed to load chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChapterClick = (chapter: VideoChapter) => {
    onSeekTo(chapter.start_time);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-white/95 backdrop-blur-lg shadow-2xl z-50 flex flex-col border-l border-slate-200/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
        <h3 className="text-lg font-bold text-slate-700 flex items-center space-x-2">
          <List className="h-5 w-5 text-slate-600" />
          <span>Chapters</span>
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-100/50 text-slate-600"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Chapters List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading chapters...</div>
        ) : chapters.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <List className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            <p>No chapters available</p>
            <p className="text-sm mt-1">Chapters will appear here when added by the instructor</p>
          </div>
        ) : (
          <div className="space-y-2">
            {chapters.map((chapter) => {
              const isActive = activeChapter?.id === chapter.id;
              const isPast = currentTime > (chapter.end_time || chapter.start_time);
              
              return (
                <button
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#4FC3F7]/20 to-[#00D4FF]/20 border-[#4FC3F7] shadow-md'
                      : isPast
                      ? 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/50'
                      : 'bg-white border-slate-200 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        {isActive && (
                          <div className="w-2 h-2 bg-[#4FC3F7] rounded-full animate-pulse" />
                        )}
                        <h4 className={`font-semibold ${isActive ? 'text-[#4FC3F7]' : 'text-slate-700'}`}>
                          {chapter.title}
                        </h4>
                      </div>
                      {chapter.description && (
                        <p className="text-xs text-slate-500 mb-2 line-clamp-2">
                          {chapter.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          {formatTime(chapter.start_time)}
                          {chapter.end_time && ` - ${formatTime(chapter.end_time)}`}
                        </span>
                      </div>
                    </div>
                    <Play className={`h-4 w-4 flex-shrink-0 ml-2 ${
                        isActive ? 'text-[#4FC3F7]' : 'text-slate-400'
                      }`} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoChaptersPanel;


