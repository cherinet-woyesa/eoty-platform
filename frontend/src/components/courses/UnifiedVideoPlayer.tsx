import * as React from 'react';
import MuxPlayer from '@mux/mux-player-react';
import type MuxPlayerElement from '@mux/mux-player';
import EnhancedVideoPlayer from './EnhancedVideoPlayer';

interface UnifiedVideoPlayerProps {
  lesson: {
    id: string;
    title?: string;
    video_provider?: 'mux' | 's3';
    mux_playback_id?: string;
    video_url?: string;
  };
  autoPlay?: boolean;
  onTimestampClick?: (timestamp: number) => void;
  courseTitle?: string;
  chapterTitle?: string;
  onQualityChange?: (quality: string) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onError?: (error: Error) => void;
  onLoad?: (metadata: any) => void;
  onProgress?: (time: number) => void;
  onComplete?: () => void;
}

interface ViewingSession {
  startTime: number;
  lastProgressTime: number;
  totalWatchTime: number;
}

/**
 * UnifiedVideoPlayer - Detects video provider and renders appropriate player
 * 
 * This component provides a unified interface for playing videos from either:
 * - Mux (modern streaming platform with adaptive bitrate)
 * - S3 (legacy storage for backward compatibility)
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.2
 */
const UnifiedVideoPlayer: React.FC<UnifiedVideoPlayerProps> = ({
  lesson,
  autoPlay = false,
  onTimestampClick,
  courseTitle,
  chapterTitle,
  onQualityChange,
  onPlaybackRateChange,
  onFullscreenChange,
  onError,
  onLoad,
  onProgress,
  onComplete
}) => {
  const muxPlayerRef = React.useRef<MuxPlayerElement>(null);
  const [viewingSession, setViewingSession] = React.useState<ViewingSession>({
    startTime: Date.now(),
    lastProgressTime: 0,
    totalWatchTime: 0
  });
  const [currentPlaybackRate, setCurrentPlaybackRate] = React.useState(1);
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // Detect video provider
  const videoProvider = React.useMemo(() => {
    // Explicit provider field takes precedence
    if (lesson.video_provider) {
      return lesson.video_provider;
    }
    
    // If Mux playback ID exists, use Mux
    if (lesson.mux_playback_id) {
      return 'mux';
    }
    
    // Otherwise, fallback to S3
    return 's3';
  }, [lesson.video_provider, lesson.mux_playback_id]);

  console.log('UnifiedVideoPlayer - Provider detection:', {
    lessonId: lesson.id,
    provider: videoProvider,
    muxPlaybackId: lesson.mux_playback_id,
    videoUrl: lesson.video_url
  });

  // Track viewing analytics for Mux videos (Requirement 2.5)
  React.useEffect(() => {
    if (videoProvider !== 'mux') return;

    // Start progress tracking interval
    progressIntervalRef.current = setInterval(() => {
      const player = muxPlayerRef.current;
      if (player && !player.paused) {
        const currentTime = player.currentTime || 0;
        const duration = player.duration || 0;
        
        setViewingSession(prev => {
          const watchTime = prev.totalWatchTime + 1;
          return {
            ...prev,
            lastProgressTime: currentTime,
            totalWatchTime: watchTime
          };
        });

        // Send progress update to backend
        if (currentTime > 0 && duration > 0) {
          const progress = (currentTime / duration) * 100;
          onProgress?.(currentTime);
          
          // Log analytics every 10 seconds
          if (Math.floor(currentTime) % 10 === 0) {
            console.log('Video analytics:', {
              lessonId: lesson.id,
              currentTime,
              duration,
              progress: progress.toFixed(2) + '%',
              watchTime: viewingSession.totalWatchTime
            });
          }
        }
      }
    }, 1000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [videoProvider, lesson.id, onProgress, viewingSession.totalWatchTime]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Render Mux Player for Mux videos (Requirements: 2.1, 2.3, 2.4, 2.5)
  if (videoProvider === 'mux' && lesson.mux_playback_id) {
    return (
      <div className="unified-video-player mux-player-container">
        <MuxPlayer
          ref={muxPlayerRef}
          playbackId={lesson.mux_playback_id}
          metadata={{
            video_id: lesson.id,
            video_title: lesson.title || 'Untitled Lesson',
            viewer_user_id: localStorage.getItem('userId') || undefined
          }}
          streamType="on-demand"
          autoPlay={autoPlay}
          // Enable playback speed controls (Requirement 2.3)
          playbackRates={[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]}
          defaultShowRemainingTime
          // Enable quality selector (Requirement 2.4)
          // Mux Player automatically provides quality selection
          onError={(error) => {
            console.error('Mux Player error:', error);
            onError?.(new Error('Mux playback error'));
          }}
          onLoadedMetadata={(e) => {
            console.log('Mux video loaded:', e);
            const player = e.target as MuxPlayerElement;
            onLoad?.({ 
              lesson,
              duration: player.duration,
              videoWidth: player.videoWidth,
              videoHeight: player.videoHeight
            });
          }}
          onTimeUpdate={(e) => {
            const player = e.target as MuxPlayerElement;
            onProgress?.(player.currentTime || 0);
          }}
          onEnded={() => {
            console.log('Mux video completed');
            // Track completion analytics
            console.log('Video viewing session completed:', {
              lessonId: lesson.id,
              totalWatchTime: viewingSession.totalWatchTime,
              sessionDuration: Date.now() - viewingSession.startTime
            });
            onComplete?.();
          }}
          onRateChange={(e) => {
            const player = e.target as MuxPlayerElement;
            const rate = player.playbackRate || 1;
            setCurrentPlaybackRate(rate);
            onPlaybackRateChange?.(rate);
            console.log('Playback rate changed:', rate);
          }}
          onPlay={() => {
            console.log('Video playback started');
          }}
          onPause={() => {
            console.log('Video playback paused');
          }}
          onSeeking={() => {
            const player = muxPlayerRef.current;
            if (player) {
              console.log('Video seeking to:', player.currentTime);
            }
          }}
          style={{
            width: '100%',
            aspectRatio: '16/9',
            '--controls': 'auto',
            '--media-object-fit': 'contain',
            '--media-object-position': 'center'
          } as React.CSSProperties}
        />
        
        {/* Display current playback rate indicator */}
        {currentPlaybackRate !== 1 && (
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm font-medium">
            {currentPlaybackRate}x
          </div>
        )}
      </div>
    );
  }

  // Render legacy player for S3 videos
  if (videoProvider === 's3' && lesson.video_url) {
    return (
      <div className="unified-video-player legacy-player-container">
        <EnhancedVideoPlayer
          videoUrl={lesson.video_url}
          title={lesson.title}
          lessonId={lesson.id}
          autoPlay={autoPlay}
          onTimestampClick={onTimestampClick}
          courseTitle={courseTitle}
          chapterTitle={chapterTitle}
          onQualityChange={onQualityChange}
          onPlaybackRateChange={onPlaybackRateChange}
          onFullscreenChange={onFullscreenChange}
          onError={onError}
          onLoad={onLoad}
        />
      </div>
    );
  }

  // No video available
  return (
    <div className="unified-video-player no-video-container">
      <div className="flex items-center justify-center bg-gray-900 rounded-lg" style={{ aspectRatio: '16/9' }}>
        <div className="text-center text-white p-6">
          <svg
            className="h-16 w-16 mx-auto mb-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No Video Available</h3>
          <p className="text-gray-400 text-sm">
            This lesson doesn't have a video yet.
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnifiedVideoPlayer;
