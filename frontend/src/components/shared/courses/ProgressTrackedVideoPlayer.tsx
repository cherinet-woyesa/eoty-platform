import React, { useEffect, useRef, useState } from 'react';
import { videoProgressApi } from '../../../services/api/videoProgress';
import type { VideoChapter } from '../../../services/api/videoProgress';
import UnifiedVideoPlayer from './UnifiedVideoPlayer';

interface ProgressTrackedVideoPlayerProps {
  lesson: {
    id: string;
    title?: string;
    video_provider?: 'mux';
    mux_playback_id?: string | null;
    mux_asset_id?: string | null;
    mux_status?: string | null;
    allow_download?: boolean;
  };
  autoPlay?: boolean;
  courseTitle?: string;
  chapterTitle?: string;
  onComplete?: () => void;
}

export const ProgressTrackedVideoPlayer: React.FC<ProgressTrackedVideoPlayerProps> = ({
  lesson,
  autoPlay = false,
  courseTitle,
  chapterTitle,
  onComplete
}) => {
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [chapters, setChapters] = useState<VideoChapter[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [preferredQuality, setPreferredQuality] = useState('auto');
  
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);

  useEffect(() => {
    loadProgress();
    loadPreferences();
    loadChapters();

    // Start progress tracking interval
    progressTimerRef.current = setInterval(() => {
      saveProgress();
    }, 10000); // Save every 10 seconds

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
      // Save progress one final time on unmount
      saveProgress();
    };
  }, [lesson.id]);

  const loadProgress = async () => {
    const result = await videoProgressApi.getProgress(parseInt(lesson.id));
    if (result.success && result.data?.progress) {
      setCompletionPercentage(result.data.progress.completion_percentage);
    }
  };

  const loadPreferences = async () => {
    const result = await videoProgressApi.getPreferences();
    if (result.success && result.data?.preferences) {
      setPlaybackSpeed(result.data.preferences.playback_speed);
      setPreferredQuality(result.data.preferences.preferred_quality);
    }
  };

  const loadChapters = async () => {
    const result = await videoProgressApi.getChapters(parseInt(lesson.id));
    if (result.success && result.data?.chapters) {
      setChapters(result.data.chapters);
    }
  };

  const saveProgress = async () => {
    if (durationRef.current === 0) return;

    const percentage = (currentTimeRef.current / durationRef.current) * 100;
    const completed = percentage >= 90;

    await videoProgressApi.updateProgress(parseInt(lesson.id), {
      current_time: currentTimeRef.current,
      duration: durationRef.current,
      completion_percentage: percentage,
      completed
    });

    setCompletionPercentage(percentage);

    if (completed && onComplete) {
      onComplete();
    }
  };

  // UnifiedVideoPlayer updates time via callbacks below; keep refs for progress

  const handlePlaybackRateChange = async (rate: number) => {
    setPlaybackSpeed(rate);
    await videoProgressApi.updatePreferences({ playback_speed: rate });
  };

  const handleQualityChange = async (quality: string) => {
    setPreferredQuality(quality);
    await videoProgressApi.updatePreferences({ preferred_quality: quality });
  };

  return (
    <div className="relative">
      {/* Completion Badge */}
      {completionPercentage > 0 && (
        <div className="absolute top-4 right-4 z-50 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
          {Math.round(completionPercentage)}% Complete
        </div>
      )}

      {/* Chapter Markers Display (optional UI enhancement) */}
      {chapters.length > 0 && (
        <div className="absolute top-4 left-4 z-50 bg-black bg-opacity-70 text-white px-3 py-2 rounded-lg text-sm shadow-lg max-w-xs">
          <div className="font-semibold mb-1">Chapters Available</div>
          <div className="text-xs text-gray-300">{chapters.length} chapters in this video</div>
        </div>
      )}

      <UnifiedVideoPlayer
        lesson={lesson}
        autoPlay={autoPlay}
        courseTitle={courseTitle}
        chapterTitle={chapterTitle}
        onTimestampClick={(timestamp) => {
          currentTimeRef.current = timestamp;
        }}
        onPlaybackRateChange={handlePlaybackRateChange}
        onQualityChange={handleQualityChange}
      />
    </div>
  );
};

export default ProgressTrackedVideoPlayer;
