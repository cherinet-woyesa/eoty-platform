import * as React from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { FileText, RotateCcw, X, Download, Maximize2, Minimize2, PictureInPicture, Monitor, Keyboard } from 'lucide-react';
import { subtitlesApi, type SubtitleTrack } from '@/services/api/subtitles';
import VideoNotesPanel from './VideoNotesPanel';
// Chapters panel removed per UX request
import { interactiveApi } from '@/services/api';
import { videoApi } from '@/services/api/videos';
import { useAuth } from '@/context/AuthContext';
import { formatTime } from '@/utils/formatters';
import { useNotification } from '@/context/NotificationContext';
import { quizApi, type QuizTrigger } from '@/services/api/quiz';
import VideoQuizOverlay from './VideoQuizOverlay';
// EnhancedVideoPlayer removed - all videos use Mux

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

interface UnifiedVideoPlayerProps {
  lesson: {
    id: string;
    title?: string;
    video_provider?: 'mux' | 's3' | string;
    mux_playback_id?: string | null;
    mux_asset_id?: string | null;
    mux_status?: string | null;
    allow_download?: boolean;
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
  /** When false, hides the in-player Theater toggle button to avoid duplicate controls when the parent owns it. */
  showTheaterToggle?: boolean;
  /** If provided, seeks the player to this time (in seconds) when it changes. */
  seekTo?: number | null;
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
  onComplete,
  showTheaterToggle = true,
  seekTo
}) => {
  const muxPlayerRef = React.useRef<any>(null);
  const [viewingSession, setViewingSession] = React.useState<ViewingSession>({
    startTime: Date.now(),
    lastProgressTime: 0,
    totalWatchTime: 0
  });
  const [currentPlaybackRate, setCurrentPlaybackRate] = React.useState(1);
  const [subtitleTracks, setSubtitleTracks] = React.useState<SubtitleTrack[]>([]);
  const [selectedSubtitleTrack, setSelectedSubtitleTrack] = React.useState<string | null>(null);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [showNotesPanel, setShowNotesPanel] = React.useState(false);
  // Chapters panel removed
  const progressIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [isTheaterMode, setIsTheaterMode] = React.useState(false);
  const [isPictureInPicture, setIsPictureInPicture] = React.useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = React.useState(false);
  const { user } = useAuth();
  const [lastWatchedPosition, setLastWatchedPosition] = React.useState<number | null>(null);
  const [showResumePrompt, setShowResumePrompt] = React.useState(false);
  const [hasResumed, setHasResumed] = React.useState(false);
  const progressSaveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const { showNotification } = useNotification();
  
  // ADA Compliance: Screen reader announcements (REQUIREMENT: ADA conformant)
  const [announcements, setAnnouncements] = React.useState<string[]>([]);
  const announce = React.useCallback((message: string) => {
    setAnnouncements(prev => [...prev, message]);
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 5000);
  }, []);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const playerContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Quiz Triggers (FR2: In-lesson quiz integration)
  const [quizTriggers, setQuizTriggers] = React.useState<QuizTrigger[]>([]);
  const [activeQuiz, setActiveQuiz] = React.useState<QuizTrigger | null>(null);
  const [completedQuizzes, setCompletedQuizzes] = React.useState<number[]>([]);
  const [duration, setDuration] = React.useState(0);
  
  // Network interruption handling (REQUIREMENT: Resume/retry capability)
  const [networkStatus, setNetworkStatus] = React.useState<'online' | 'offline' | 'buffering' | 'reconnecting'>('online');
  const [bufferingProgress, setBufferingProgress] = React.useState(0);
  const [retryCount, setRetryCount] = React.useState(0);
  const maxRetries = 3;

  // Load watch history and subtitles
  React.useEffect(() => {
    const loadWatchHistory = async () => {
      if (!user?.id || !lesson.id) return;
      
      try {
        const response = await interactiveApi.getLessonProgress(lesson.id);
        if (response.success && response.data?.progress) {
          const progress = response.data.progress;
          const lastPosition = progress.last_watched_timestamp || 0;
          
          if (lastPosition > 5) { // Only show resume if watched more than 5 seconds
            setLastWatchedPosition(lastPosition);
            setShowResumePrompt(true);
          }
        }
      } catch (error) {
        console.warn('Failed to load watch history:', error);
      }
    };

    const loadSubtitles = async () => {
      try {
        const response = await subtitlesApi.getSubtitles(lesson.id);
        if (response.success && response.data?.subtitles) {
          const tracks = response.data.subtitles;
          setSubtitleTracks(tracks);
          // Auto-select first subtitle if available and none selected
          if (tracks.length > 0 && selectedSubtitleTrack === null) {
            setSelectedSubtitleTrack(tracks[0].id);
          }
        }
      } catch (error) {
        console.warn('Failed to load subtitles:', error);
      }
    };

    const loadQuizTriggers = async () => {
      try {
        const response = await quizApi.getQuizTriggers(parseInt(lesson.id));
        if (response.success && response.data?.triggers) {
          setQuizTriggers(response.data.triggers);
          console.log('Loaded quiz triggers:', response.data.triggers);
        }
      } catch (error) {
        console.warn('Failed to load quiz triggers:', error);
      }
    };

    if (lesson.id) {
      loadWatchHistory();
      loadSubtitles();
      loadQuizTriggers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id, user?.id]);

  // Mux-only video provider detection
  const videoProvider = React.useMemo(() => {
    // Check for Mux playback ID (must be non-empty string)
    // If playback_id exists, the video is ready to play (playback_id is only assigned when video is ready)
    if (lesson.mux_playback_id && typeof lesson.mux_playback_id === 'string' && lesson.mux_playback_id.trim().length > 0) {
      // If status is explicitly errored or failed, don't play
      if (lesson.mux_status === 'errored' || lesson.mux_status === 'failed') {
        return 'none';
      }
      // If status is processing or preparing, wait
      if (lesson.mux_status === 'processing' || lesson.mux_status === 'preparing') {
        return 'none';
      }
      // If status is ready OR undefined (but playback_id exists), assume ready
      // Having a playback_id means Mux has processed the video and it's ready
      if (lesson.mux_status === 'ready' || !lesson.mux_status) {
        return 'mux';
      }
    }
    
    // Check for Mux asset ID - if we have asset_id but no playback_id, video is still processing
    if (lesson.mux_asset_id && !lesson.mux_playback_id) {
      return 'none'; // Still processing
    }
    
    // If we have asset_id and status is ready, use Mux
    if (lesson.mux_asset_id && lesson.mux_status === 'ready') {
      return 'mux';
    }
    
    return 'none';
  }, [lesson.mux_playback_id, lesson.mux_asset_id, lesson.mux_status]);

  // Reduce noisy logs in production; keep behind a compact debug flag
  const DEBUG_PROVIDER = false;
  if (DEBUG_PROVIDER) {
    console.log('UnifiedVideoPlayer - Provider detection:', {
      lessonId: lesson.id,
      provider: videoProvider,
      muxPlaybackId: lesson.mux_playback_id,
      muxStatus: lesson.mux_status
    });
  }

  // Save watch history periodically
  const saveWatchHistory = React.useCallback(async (currentTime: number, duration: number) => {
    if (!user?.id || !lesson.id || duration === 0) return;
    
    // Clear existing timeout
    if (progressSaveTimeoutRef.current) {
      clearTimeout(progressSaveTimeoutRef.current);
    }
    
    // Debounce: Save after 3 seconds of no seeking
    progressSaveTimeoutRef.current = setTimeout(async () => {
      try {
        const progress = duration > 0 ? currentTime / duration : 0;
        await interactiveApi.updateLessonProgress(lesson.id, {
          progress: Math.min(Math.max(progress, 0), 1),
          lastWatchedTimestamp: currentTime,
          isCompleted: progress >= 0.95 // Consider 95%+ as completed
        });
        setLastWatchedPosition(currentTime);
      } catch (error) {
        console.warn('Failed to save watch history:', error);
      }
    }, 3000);
  }, [user?.id, lesson.id]);

  // FIXED: Simplified analytics tracking with watch history saving
  React.useEffect(() => {
    if (videoProvider !== 'mux') return;

    const interval = setInterval(() => {
      const player = muxPlayerRef.current;
      if (player && !player.paused) {
        const currentTime = player.currentTime || 0;
        const duration = player.duration || 0;
        
        // Update viewing session
        setViewingSession(prev => ({
          ...prev,
          lastProgressTime: currentTime,
          totalWatchTime: prev.totalWatchTime + 1
        }));

        // Send progress update
        onProgress?.(currentTime);

        // Save watch history periodically (every 5 seconds)
        if (Math.floor(currentTime) % 5 === 0 && duration > 0) {
          saveWatchHistory(currentTime, duration);
        }

        // Log analytics every 10 seconds
        if (Math.floor(currentTime) % 10 === 0 && duration > 0) {
          const progress = (currentTime / duration) * 100;
          console.log('Video analytics:', {
            lessonId: lesson.id,
            currentTime,
            duration,
            progress: progress.toFixed(2) + '%',
            watchTime: viewingSession.totalWatchTime
          });
        }
      }
    }, 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      if (progressSaveTimeoutRef.current) {
        clearTimeout(progressSaveTimeoutRef.current);
      }
    };
  }, [videoProvider, lesson.id, onProgress, viewingSession.totalWatchTime, saveWatchHistory]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // External seekTo prop support
  React.useEffect(() => {
    if (typeof seekTo === 'number' && muxPlayerRef.current) {
      const player = muxPlayerRef.current;
      if (player.currentTime !== undefined) {
        player.currentTime = seekTo;
        setCurrentTime(seekTo);
      }
    }
  }, [seekTo]);

  // Handle seeking to a specific timestamp
  const handleSeekTo = React.useCallback((timestamp: number) => {
    if (muxPlayerRef.current) {
      const player = muxPlayerRef.current;
      if (player.currentTime !== undefined) {
        player.currentTime = timestamp;
        setCurrentTime(timestamp);
      }
    }
    onTimestampClick?.(timestamp);
  }, [onTimestampClick]);

  // Resume from last watched position
  const handleResume = React.useCallback(() => {
    if (lastWatchedPosition && muxPlayerRef.current) {
      const player = muxPlayerRef.current;
      if (player.currentTime !== undefined) {
        player.currentTime = lastWatchedPosition;
        setCurrentTime(lastWatchedPosition);
        setShowResumePrompt(false);
        setHasResumed(true);
      }
    }
  }, [lastWatchedPosition]);

  // Auto-resume on video load if enabled
  React.useEffect(() => {
    if (autoPlay && lastWatchedPosition && !hasResumed && muxPlayerRef.current) {
      const player = muxPlayerRef.current;
      const checkReady = () => {
        if (player.readyState >= 2) { // HAVE_CURRENT_DATA
          handleResume();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    }
  }, [autoPlay, lastWatchedPosition, hasResumed, handleResume]);

  // Handle video download
  const handleDownload = React.useCallback(async () => {
    if (!lesson.allow_download) {
      showNotification({
        type: 'warning',
        title: 'Download Not Available',
        message: 'Video download is not permitted for this lesson.',
        duration: 3000
      });
      return;
    }

    setIsDownloading(true);
    try {
      const response = await videoApi.getVideoDownloadUrl(lesson.id);
      
      if (response.success && response.data?.downloadUrl) {
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = `${lesson.title || 'video'}.mp4`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showNotification({
          type: 'success',
          title: 'Download Started',
          message: 'Your video download has started.',
          duration: 3000
        });
      } else {
        throw new Error('Failed to get download URL');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      showNotification({
        type: 'error',
        title: 'Download Failed',
        message: error.message || 'Failed to download video. Please try again.',
        duration: 5000
      });
    } finally {
      setIsDownloading(false);
    }
  }, [lesson.id, lesson.title, lesson.allow_download, showNotification]);

  // Picture-in-Picture handlers
  const handlePictureInPicture = React.useCallback(async () => {
    const player = muxPlayerRef.current;
    if (!player) return;

    try {
      if (isPictureInPicture) {
        await document.exitPictureInPicture();
      } else {
        if (player.requestPictureInPicture) {
          await player.requestPictureInPicture();
        }
      }
    } catch (error: any) {
      console.error('Picture-in-picture error:', error);
      showNotification({
        type: 'error',
        title: 'Picture-in-Picture Failed',
        message: error.message || 'Picture-in-picture is not supported.',
        duration: 3000
      });
    }
  }, [isPictureInPicture, showNotification]);

  // Monitor picture-in-picture state
  React.useEffect(() => {
    const handlePictureInPictureChange = () => {
      setIsPictureInPicture(!!document.pictureInPictureElement);
    };

    document.addEventListener('enterpictureinpicture', handlePictureInPictureChange);
    document.addEventListener('leavepictureinpicture', handlePictureInPictureChange);

    return () => {
      document.removeEventListener('enterpictureinpicture', handlePictureInPictureChange);
      document.removeEventListener('leavepictureinpicture', handlePictureInPictureChange);
    };
  }, []);

  // Theater mode toggle
  const toggleTheaterMode = React.useCallback(() => {
    setIsTheaterMode(prev => !prev);
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA' ||
          (e.target as HTMLElement).isContentEditable) {
        return;
      }

      const player = muxPlayerRef.current;
      if (!player) return;

      switch (e.key.toLowerCase()) {
        case ' ': // Spacebar - Play/Pause
          e.preventDefault();
          if (player.paused) {
            player.play().catch(console.error);
          } else {
            player.pause();
          }
          break;
        case 'k': // K - Play/Pause
          e.preventDefault();
          if (player.paused) {
            player.play().catch(console.error);
          } else {
            player.pause();
          }
          break;
        case 'arrowleft': // Left Arrow - Seek backward 5 seconds
          e.preventDefault();
          if (player.currentTime !== undefined) {
            player.currentTime = Math.max(0, (player.currentTime || 0) - 5);
          }
          break;
        case 'arrowright': // Right Arrow - Seek forward 5 seconds
          e.preventDefault();
          if (player.currentTime !== undefined) {
            const duration = player.duration || 0;
            player.currentTime = Math.min(duration, (player.currentTime || 0) + 5);
          }
          break;
        case 'arrowup': // Up Arrow - Increase volume
          e.preventDefault();
          if (player.volume !== undefined) {
            player.volume = Math.min(1, (player.volume || 0) + 0.1);
          }
          break;
        case 'arrowdown': // Down Arrow - Decrease volume
          e.preventDefault();
          if (player.volume !== undefined) {
            player.volume = Math.max(0, (player.volume || 0) - 0.1);
          }
          break;
        case 'm': // M - Mute/Unmute
          e.preventDefault();
          if (player.muted !== undefined) {
            player.muted = !player.muted;
          }
          break;
        case 'f': // F - Fullscreen
          e.preventDefault();
          if (isFullscreen) {
            document.exitFullscreen().catch(console.error);
          } else {
            playerContainerRef.current?.requestFullscreen().catch(console.error);
          }
          break;
        case 't': // T - Theater mode
          e.preventDefault();
          toggleTheaterMode();
          break;
        case 'p': // P - Picture-in-picture
          e.preventDefault();
          handlePictureInPicture();
          break;
        case '?': // ? - Show keyboard shortcuts
          e.preventDefault();
          setShowKeyboardShortcuts(prev => !prev);
          break;
        case 'escape': // Escape - Exit fullscreen/theater mode
          if (isFullscreen) {
            document.exitFullscreen().catch(console.error);
          }
          if (isTheaterMode) {
            setIsTheaterMode(false);
          }
          if (showKeyboardShortcuts) {
            setShowKeyboardShortcuts(false);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, isTheaterMode, showKeyboardShortcuts, toggleTheaterMode, handlePictureInPicture]);

  // Handle fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      onFullscreenChange?.(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onFullscreenChange]);

  // FIXED: Render Mux Player ONLY if we have valid playback ID
  if (videoProvider === 'mux' && lesson.mux_playback_id) {
    return (
      <>
      <div 
        ref={playerContainerRef}
        className={`unified-video-player mux-player-container relative ${isMobile ? 'mobile-player' : ''} ${
          isTheaterMode ? 'theater-mode' : ''
        }`}
        style={isTheaterMode ? {
          maxWidth: '100%',
          margin: '0 auto',
          padding: '0 2rem'
        } : {}}
      >
        {/* Control Buttons - Mobile optimized */}
        <div className={`absolute z-20 flex items-center space-x-2 ${
            isMobile 
              ? 'top-2 left-2' 
              : 'top-4 left-4'
          }`}>
          {/* Chapters button removed per UX; notes remain accessible */}

          {/* Notes Panel Toggle Button */}
          <button
            onClick={() => {
              setShowNotesPanel(!showNotesPanel);
              // Chapters panel hidden
            }}
            className={`bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all flex items-center space-x-2 shadow-lg ${
              isMobile ? 'p-2' : 'p-3'
            }`}
            title="Notes & Bookmarks"
          >
            <FileText className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
            {!isMobile && <span className="text-sm font-medium">Notes</span>}
          </button>

          {/* Download Button - Only show if download is allowed */}
          {lesson.allow_download && (
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={`bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all flex items-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                isMobile ? 'p-2' : 'p-3'
              }`}
              title="Download Video"
            >
              {isDownloading ? (
                <div className={`animate-spin rounded-full border-2 border-white border-t-transparent ${
                  isMobile ? 'h-4 w-4' : 'h-5 w-5'
                }`} />
              ) : (
                <Download className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
              )}
              {!isMobile && !isDownloading && <span className="text-sm font-medium">Download</span>}
            </button>
          )}

          {/* Picture-in-Picture Button */}
          {document.pictureInPictureEnabled && (
            <button
              onClick={handlePictureInPicture}
              className={`bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all flex items-center space-x-2 shadow-lg ${
                isMobile ? 'p-2' : 'p-3'
              }`}
              title="Picture-in-Picture"
            >
              <PictureInPicture className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
              {!isMobile && <span className="text-sm font-medium">PiP</span>}
            </button>
          )}

          {/* Theater Mode Button (optional to avoid duplicate controls when parent renders one) */}
          {showTheaterToggle && (
            <button
              onClick={toggleTheaterMode}
              className={`bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all flex items-center space-x-2 shadow-lg ${
                isMobile ? 'p-2' : 'p-3'
              } ${isTheaterMode ? 'bg-[#4FC3F7]/90' : ''}`}
              title="Theater Mode"
            >
              <Monitor className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
              {!isMobile && <span className="text-sm font-medium">Theater</span>}
            </button>
          )}

          {/* Fullscreen Button */}
          <button
            onClick={() => {
              if (isFullscreen) {
                document.exitFullscreen().catch(console.error);
              } else {
                playerContainerRef.current?.requestFullscreen().catch(console.error);
              }
            }}
            className={`bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all flex items-center space-x-2 shadow-lg ${
              isMobile ? 'p-2' : 'p-3'
            }`}
            title="Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
            ) : (
              <Maximize2 className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
            )}
            {!isMobile && <span className="text-sm font-medium">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>}
          </button>

          {/* Keyboard Shortcuts Help Button */}
          <button
            onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
            className={`bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all flex items-center space-x-2 shadow-lg ${
              isMobile ? 'p-2' : 'p-3'
            } ${showKeyboardShortcuts ? 'bg-[#39FF14]/90' : ''}`}
            title="Keyboard Shortcuts (Press ?)"
          >
            <Keyboard className={isMobile ? 'h-4 w-4' : 'h-5 w-5'} />
            {!isMobile && <span className="text-sm font-medium">Shortcuts</span>}
          </button>
        </div>

        {/* Keyboard Shortcuts Help Modal */}
        {showKeyboardShortcuts && (
          <div className={`absolute z-50 bg-black/90 backdrop-blur-sm text-white rounded-lg shadow-2xl ${
              isMobile ? 'top-16 left-2 right-2 p-4' : 'top-20 left-1/2 -translate-x-1/2 p-6 min-w-[400px]'
            }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Keyboard className="h-5 w-5" />
                <span>Keyboard Shortcuts</span>
              </h3>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/80">Play/Pause</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">Space</kbd> or <kbd className="px-2 py-1 bg-white/20 rounded text-xs">K</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/80">Seek Backward 5s</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">←</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/80">Seek Forward 5s</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">→</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/80">Increase Volume</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">↑</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/80">Decrease Volume</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">↓</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/80">Mute/Unmute</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">M</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/80">Fullscreen</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">F</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/80">Theater Mode</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">T</kbd>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/10">
                <span className="text-white/80">Picture-in-Picture</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">P</kbd>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-white/80">Show Shortcuts</span>
                <kbd className="px-2 py-1 bg-white/20 rounded text-xs">?</kbd>
              </div>
            </div>
          </div>
        )}

        {/* Chapters Panel removed */}

        {/* Notes Panel */}
        <VideoNotesPanel
          lessonId={lesson.id}
          currentTime={currentTime}
          onSeekTo={handleSeekTo}
          isOpen={showNotesPanel}
          onClose={() => setShowNotesPanel(false)}
        />

        {/* Resume from last position prompt */}
        {showResumePrompt && lastWatchedPosition && !hasResumed && (
          <div className={`absolute z-30 bg-black/80 backdrop-blur-sm text-white rounded-lg shadow-2xl ${
              isMobile ? 'bottom-20 left-2 right-2 p-4' : 'bottom-24 left-1/2 -translate-x-1/2 p-6 min-w-[400px]'
            }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <RotateCcw className="h-5 w-5 text-[#39FF14]" />
                <h3 className={`font-semibold ${isMobile ? 'text-sm' : 'text-base'}`}>
                  Resume from last position?
                </h3>
              </div>
              <button
                onClick={() => setShowResumePrompt(false)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className={`text-white/80 mb-4 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              You were watching at {formatTime(lastWatchedPosition)}. Would you like to continue from there?
            </p>
            <div className={`flex space-x-2 ${isMobile ? 'flex-col' : ''}`}>
              <button
                onClick={handleResume}
                className={`flex-1 px-4 py-2 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-lg hover:from-[#00E6B8] hover:to-[#00D4A3] transition-all font-medium ${
                    isMobile ? 'text-sm' : ''
                  }`}
              >
                Resume from {formatTime(lastWatchedPosition)}
              </button>
              <button
                onClick={() => {
                  setShowResumePrompt(false);
                  setHasResumed(true); // Prevent auto-resume
                }}
                className={`px-4 py-2 border border-white/30 rounded-lg hover:bg-white/10 transition-all ${
                    isMobile ? 'text-sm' : ''
                  }`}
              >
                Start from beginning
              </button>
            </div>
          </div>
        )}

        {/* ADA Compliance: Screen reader announcements (REQUIREMENT: ADA conformant) */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announcements.map((msg, index) => (
            <div key={index}>{msg}</div>
          ))}
        </div>

        {/* Network Status Indicator (REQUIREMENT: Resume/retry capability) */}
        {networkStatus !== 'online' && (
          <div className="absolute top-4 right-4 z-40 bg-black/80 backdrop-blur-sm text-white rounded-lg p-3 shadow-lg">
            {networkStatus === 'buffering' && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="text-sm">Buffering...</span>
              </div>
            )}
            {networkStatus === 'reconnecting' && (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span className="text-sm">Reconnecting... (Attempt {retryCount + 1}/{maxRetries})</span>
              </div>
            )}
            {networkStatus === 'offline' && (
              <div className="flex items-center space-x-2">
                <X className="h-4 w-4 text-red-400" />
                <span className="text-sm">Connection lost. Progress saved.</span>
              </div>
            )}
          </div>
        )}

        <MuxPlayer
          ref={muxPlayerRef}
          playbackId={lesson.mux_playback_id || undefined}
          metadata={{
            video_id: lesson.id,
            video_title: lesson.title || 'Untitled Lesson',
            viewer_user_id: localStorage.getItem('userId') || undefined
          }}
          streamType="on-demand"
          autoPlay={autoPlay}
          playbackRates={[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]}
          defaultShowRemainingTime
          // ADA Compliance: ARIA labels (REQUIREMENT: ADA conformant)
          aria-label={lesson.title ? `Video player: ${lesson.title}` : 'Educational video content'}
          aria-describedby={`video-description-${lesson.id}`}
          onError={(event: any) => {
            console.error('Mux Player error:', event);
            const errorMessage = event?.detail?.message || event?.message || 'Mux playback error';
            const errorCode = event?.detail?.code || event?.code;
            
            console.error('Mux Player error details:', {
              error: event,
              errorCode,
              playbackId: lesson.mux_playback_id,
              lessonId: lesson.id,
              muxStatus: lesson.mux_status,
              videoProvider: lesson.video_provider
            });
            
            // Network interruption handling (REQUIREMENT: Resume/retry capability)
            if (errorCode === 'NETWORK_ERROR' || errorMessage?.includes('network') || errorMessage?.includes('fetch')) {
              setNetworkStatus('reconnecting');
              if (retryCount < maxRetries) {
                setTimeout(() => {
                  setRetryCount(prev => prev + 1);
                  const player = muxPlayerRef.current;
                  if (player) {
                    player.load();
                    setNetworkStatus('online');
                  }
                }, 2000 * (retryCount + 1)); // Exponential backoff
              } else {
                setNetworkStatus('offline');
                announce('Network connection lost. Please check your internet connection.');
              }
            }
            
            // Handle specific error codes
            let userFriendlyMessage = 'Video playback error';
            if (errorCode === 404 || errorMessage?.includes('404')) {
              userFriendlyMessage = 'Video not found. The video may still be processing or the playback ID is invalid.';
            } else if (errorCode === 403 || errorMessage?.includes('403') || errorMessage?.includes('Forbidden')) {
              // 403 Forbidden usually means the asset isn't ready or playback ID is incorrect
              if (lesson.mux_status === 'processing' || !lesson.mux_status) {
                userFriendlyMessage = 'Video is still processing. Please wait a few moments and try again.';
              } else {
                userFriendlyMessage = 'Video access denied. The video may not be ready yet. Please refresh the page or contact support if the issue persists.';
              }
            } else if (lesson.mux_status === 'processing') {
              userFriendlyMessage = 'Video is still processing. Please wait a few moments and try again.';
            }
            
            // If playback ID exists but player fails, log more details
            if (lesson.mux_playback_id) {
              console.warn('Mux playback failed despite having playback ID:', {
                playbackId: lesson.mux_playback_id,
                status: lesson.mux_status,
                provider: lesson.video_provider,
                errorCode,
                errorMessage
              });
            }
            
            onError?.(new Error(userFriendlyMessage));
          }}
          onWaiting={() => {
            // Network buffering (REQUIREMENT: Resume/retry capability)
            setNetworkStatus('buffering');
            announce('Video is buffering. Please wait...');
          }}
          onCanPlay={() => {
            // Network recovered (REQUIREMENT: Resume/retry capability)
            if (networkStatus === 'buffering' || networkStatus === 'reconnecting') {
              setNetworkStatus('online');
              setRetryCount(0);
              announce('Video playback resumed');
            }
          }}
          onLoadedMetadata={(event: any) => {
            console.log('Mux video loaded:', event);
            const player = event.target;
            setDuration(player.duration || 0);
            onLoad?.({ 
              lesson,
              duration: player.duration,
              videoWidth: player.videoWidth,
              videoHeight: player.videoHeight
            });
            
            // ADA Compliance: Announce video loaded (REQUIREMENT: ADA conformant)
            announce(`Video loaded: ${lesson.title || 'Untitled Lesson'}`);
            
            // Auto-resume if enabled and not already resumed
            if (autoPlay && lastWatchedPosition && !hasResumed && player.readyState >= 2) {
              player.currentTime = lastWatchedPosition;
              setCurrentTime(lastWatchedPosition);
              setHasResumed(true);
              announce(`Resuming from ${formatTime(lastWatchedPosition)}`);
            }
          }}
          onTimeUpdate={(event: any) => {
            const player = event.target;
            const time = player.currentTime || 0;
            setCurrentTime(time);
            onProgress?.(time);
            
            // Check for quiz triggers (FR2: In-lesson quiz integration)
            if (quizTriggers.length > 0 && !activeQuiz) {
              const trigger = quizTriggers.find(t => 
                Math.abs(t.trigger_timestamp - time) < 0.5 &&
                !completedQuizzes.includes(t.id)
              );
              
              if (trigger) {
                console.log('Quiz trigger detected at', time, 'seconds:', trigger);
                if (trigger.pause_video && muxPlayerRef.current) {
                  muxPlayerRef.current.pause();
                }
                setActiveQuiz(trigger);
                announce(`Quiz question: ${trigger.question_text}`);
              }
            }
          }}
          onEnded={() => {
            console.log('Mux video completed');
            console.log('Video viewing session completed:', {
              lessonId: lesson.id,
              totalWatchTime: viewingSession.totalWatchTime,
              sessionDuration: Date.now() - viewingSession.startTime
            });
            // ADA Compliance: Announce video ended (REQUIREMENT: ADA conformant)
            announce('Video playback completed');
            onComplete?.();
          }}
          onRateChange={(event: any) => {
            const player = event.target;
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
            maxHeight: isTheaterMode ? '85vh' : (isMobile ? 'calc(100vh - 200px)' : 'none'),
            // @ts-ignore: CSS var understood by mux-player
            ['--media-object-fit' as any]: 'cover'
          }}
          playsInline
        />
        
        {/* Quiz Timeline Markers (FR2: In-lesson quiz integration) */}
        {quizTriggers.length > 0 && duration > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none z-20">
            {quizTriggers.map(trigger => (
              <div
                key={trigger.id}
                className="absolute top-0 w-1 h-2 -mt-0.5 transition-colors"
                style={{
                  left: `${(trigger.trigger_timestamp / duration) * 100}%`,
                  backgroundColor: completedQuizzes.includes(trigger.id)
                    ? '#27AE60' // Green for completed
                    : '#F39C12' // Orange for pending
                }}
                title={`Quiz: ${trigger.question_text.substring(0, 40)}...`}
              />
            ))}
          </div>
        )}
        
        {/* Display current playback rate indicator - Mobile optimized */}
        {currentPlaybackRate !== 1 && (
          <div className={`absolute bg-black/70 text-white rounded-lg font-medium z-10 ${
            isMobile 
              ? 'top-2 right-2 px-2 py-1 text-xs' 
              : 'top-4 right-4 px-3 py-1 text-sm'
          }`}>
            {currentPlaybackRate}x
          </div>
        )}
      </div>
      
      {/* Quiz Overlay (FR2: In-lesson quiz integration) */}
      {activeQuiz && (
        <VideoQuizOverlay
          trigger={activeQuiz}
          lessonId={parseInt(lesson.id)}
          onComplete={(score, passed, correct) => {
            if (!activeQuiz) return;
            
            console.log('Quiz completed:', { score, passed, correct });
            const quizId = activeQuiz.id;
            const shouldPause = activeQuiz.pause_video;
            setCompletedQuizzes([...completedQuizzes, quizId]);
            setActiveQuiz(null);
            
            // Resume video if it was paused
            if (shouldPause && muxPlayerRef.current) {
              muxPlayerRef.current.play();
            }
            
            // Show success notification
            if (correct) {
              showNotification({
                type: 'success',
                title: 'Correct Answer!',
                message: '🎉 Great job!',
                duration: 3000
              });
            } else if (passed) {
              showNotification({
                type: 'info',
                title: 'Quiz Completed',
                message: 'Moving on...',
                duration: 3000
              });
            }
          }}
          onSkip={!activeQuiz.is_required ? () => {
            console.log('Quiz skipped');
            setActiveQuiz(null);
            if (muxPlayerRef.current) {
              muxPlayerRef.current.play();
            }
          } : undefined}
        />
      )}
    </>
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
          <h3 className="text-xl font-semibold mb-2">Video Not Available</h3>
          <p className="text-gray-400 mb-6">
            {lesson.mux_status === 'preparing' || lesson.mux_status === 'processing'
              ? 'The video is still being processed. This usually takes a few minutes. You will be notified when it\'s ready.'
              : lesson.mux_status === 'errored' || lesson.mux_status === 'failed'
              ? 'The video processing encountered an error. Please contact support or try again later.'
              : 'This lesson does not have a video yet. Please check back later or contact your instructor.'}
          </p>
          
          {/* Enhanced UX: Retry button and status updates (REQUIREMENT: Better error messaging) */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {(lesson.mux_status === 'processing' || lesson.mux_status === 'preparing' || lesson.mux_status === 'errored' || lesson.mux_status === 'failed') && (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                aria-label="Retry loading video"
              >
                Check Again
              </button>
            )}
            <button
              onClick={() => window.history.back()}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
              aria-label="Go back"
            >
              Go Back
            </button>
          </div>
          
          {/* Processing status indicator (REQUIREMENT: Processing status updates) */}
          {(lesson.mux_status === 'processing' || lesson.mux_status === 'preparing') && (
            <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
              <span>Video is being processed...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedVideoPlayer;