import * as React from 'react';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, 
  RotateCcw, Bookmark, MessageCircle, PenTool,
  CheckCircle, X, AlertCircle, Clock, Send,
  Loader, BookOpen, Subtitles, Settings, WifiOff, Info,
  SkipBack, SkipForward, CatIcon
} from 'lucide-react';

interface ADACompliantVideoPlayerProps {
  videoUrl: string;
  title?: string;
  lessonId: string;
  autoPlay?: boolean;
  onTimestampClick?: (timestamp: number) => void;
  subtitles?: Array<{
    languageCode: string;
    languageName: string;
    url: string;
  }>;
}

const ADACompliantVideoPlayer: React.FC<ADACompliantVideoPlayerProps> = ({ 
  videoUrl, 
  title, 
  lessonId,
  autoPlay = false,
  onTimestampClick,
  subtitles = []
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(autoPlay);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [playbackRate, setPlaybackRate] = React.useState(1);
  const [showControls, setShowControls] = React.useState(true);
  const [networkError, setNetworkError] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  const [selectedSubtitle, setSelectedSubtitle] = React.useState<string | null>(null);
  const [showSubtitleMenu, setShowSubtitleMenu] = React.useState(false);
  const [showPlaybackMenu, setShowPlaybackMenu] = React.useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = React.useState(false);
  
  // Accessibility state
  const [announcements, setAnnouncements] = React.useState<string[]>([]);
  const [focusableElements, setFocusableElements] = React.useState<HTMLElement[]>([]);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Add announcement for screen readers
  const announce = (message: string) => {
    setAnnouncements(prev => [...prev, message]);
    // Clear announcements after 5 seconds
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 5000);
  };

  // Video control functions
  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handleEnd = () => {
      setIsPlaying(false);
      announce('Video ended');
    };
    const handleError = () => {
      setNetworkError(true);
      announce('Video streaming error occurred');
      console.error('Video streaming error');
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('ended', handleEnd);
    video.addEventListener('error', handleError);

    // Initialize focusable elements
    const updateFocusableElements = () => {
      if (video.parentElement) {
        const elements = video.parentElement.querySelectorAll(
          'button, input, select, a, [tabindex]:not([tabindex="-1"])'
        );
        setFocusableElements(Array.from(elements) as HTMLElement[]);
      }
    };

    updateFocusableElements();

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('ended', handleEnd);
      video.removeEventListener('error', handleError);
      
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!videoRef.current) return;

    switch (e.key) {
      case ' ':
      case 'k':
      case 'K':
        togglePlay();
        e.preventDefault();
        break;
      case 'ArrowLeft':
        skipBackward(10);
        e.preventDefault();
        break;
      case 'ArrowRight':
        skipForward(10);
        e.preventDefault();
        break;
      case 'ArrowUp':
        adjustVolume(0.1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        adjustVolume(-0.1);
        e.preventDefault();
        break;
      case 'm':
      case 'M':
        toggleMute();
        e.preventDefault();
        break;
      case 'f':
      case 'F':
        toggleFullscreen();
        e.preventDefault();
        break;
      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        seekToPercentage(parseInt(e.key) * 10);
        e.preventDefault();
        break;
      default:
        break;
    }
  };

  // Mouse movement to show/hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      announce('Video paused');
    } else {
      video.play().catch(error => {
        console.error('Error playing video:', error);
        if (error.name === 'NotAllowedError') {
          announce('Please interact with the page to enable video playback');
        }
      });
      announce('Video playing');
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
    announce(`Seeked to ${formatTime(newTime)}`);
  };

  const skipBackward = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.max(0, video.currentTime - seconds);
    announce(`Skipped backward ${seconds} seconds`);
  };

  const skipForward = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.min(video.duration, video.currentTime + seconds);
    announce(`Skipped forward ${seconds} seconds`);
  };

  const adjustVolume = (delta: number) => {
    const newVolume = Math.min(1, Math.max(0, volume + delta));
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    
    announce(`Volume set to ${Math.round(newVolume * 100)}%`);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    announce(`Volume set to ${Math.round(newVolume * 100)}%`);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
    announce(video.muted ? 'Volume muted' : 'Volume unmuted');
  };

  const handlePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowPlaybackMenu(false);
    announce(`Playback speed set to ${rate}x`);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
        announce('Failed to enter fullscreen mode');
      });
      announce('Entered fullscreen mode');
    } else {
      document.exitFullscreen();
      announce('Exited fullscreen mode');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const seekToPercentage = (percentage: number) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    
    const newTime = (percentage / 100) * duration;
    video.currentTime = newTime;
    setCurrentTime(newTime);
    announce(`Seeked to ${percentage}%`);
  };

  const handleRetry = () => {
    setNetworkError(false);
    setRetryCount(prev => prev + 1);
    // Reload the video
    if (videoRef.current) {
      videoRef.current.load();
    }
    announce('Retrying video stream');
  };

  const handleSubtitleSelect = (subtitleId: string | null) => {
    setSelectedSubtitle(subtitleId);
    setShowSubtitleMenu(false);
    
    if (subtitleId) {
      const subtitle = subtitles.find(s => s.languageCode === subtitleId);
      if (subtitle) {
        announce(`Subtitles enabled in ${subtitle.languageName}`);
      }
    } else {
      announce('Subtitles disabled');
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="bg-black rounded-2xl overflow-hidden relative"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={handleMouseMove}
    >
      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only">
        {announcements.map((msg, index) => (
          <div key={index}>{msg}</div>
        ))}
      </div>

      {/* Video Element */}
      <video
        ref={videoRef}
        src={`${videoUrl}?retry=${retryCount}`}
        className="w-full aspect-video"
        autoPlay={autoPlay}
        aria-label={title ? `Video: ${title}` : "Educational video content"}
        aria-describedby={`video-description-${lessonId}`}
      />

      {/* Network Error Overlay */}
      {networkError && (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
          <div className="text-center text-white p-6">
            <WifiOff className="h-12 w-12 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Network Error</h3>
            <p className="mb-4">Unable to stream video. Check your connection and try again.</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors duration-150"
              aria-label="Retry video stream"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Video Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="flex items-center mb-4">
          <span className="text-white text-sm min-w-[50px]" aria-label={`Current time: ${formatTime(currentTime)}`}>
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 mx-2 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            aria-label="Seek video position"
          />
          <span className="text-white text-sm min-w-[50px]" aria-label={`Total duration: ${formatTime(duration)}`}>
            {formatTime(duration)}
          </span>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-gray-300 transition-colors duration-150"
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </button>

            {/* Skip Backward */}
            <button
              onClick={() => skipBackward(10)}
              className="text-white hover:text-gray-300 transition-colors duration-150"
              aria-label="Skip backward 10 seconds"
            >
              <SkipBack className="h-5 w-5" />
            </button>

            {/* Skip Forward */}
            <button
              onClick={() => skipForward(10)}
              className="text-white hover:text-gray-300 transition-colors duration-150"
              aria-label="Skip forward 10 seconds"
            >
              <SkipForward className="h-5 w-5" />
            </button>

            {/* Volume Control */}
            <div className="flex items-center space-x-2 relative">
              <button
                onClick={toggleMute}
                className="text-white hover:text-gray-300 transition-colors duration-150"
                aria-label={isMuted ? "Unmute volume" : "Mute volume"}
                onMouseEnter={() => setShowVolumeSlider(true)}
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </button>
              
              {showVolumeSlider && (
                <div 
                  className="absolute bottom-full left-0 mb-2 bg-gray-800 p-2 rounded"
                  onMouseEnter={() => setShowVolumeSlider(true)}
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                    aria-label="Volume control"
                  />
                </div>
              )}
            </div>

            {/* Playback Speed */}
            <div className="relative">
              <button
                onClick={() => setShowPlaybackMenu(!showPlaybackMenu)}
                className="text-white hover:text-gray-300 transition-colors duration-150 text-sm font-medium"
                aria-label={`Playback speed: ${playbackRate}x`}
                aria-haspopup="true"
                aria-expanded={showPlaybackMenu}
              >
                {playbackRate}x
              </button>
              
              {showPlaybackMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded shadow-lg py-2 w-32">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRate(rate)}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                        playbackRate === rate ? 'text-blue-400' : 'text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtitles */}
            <div className="relative">
              <button
                onClick={() => setShowSubtitleMenu(!showSubtitleMenu)}
                className="text-white hover:text-gray-300 transition-colors duration-150"
                aria-label={selectedSubtitle ? `Subtitles enabled in ${subtitles.find(s => s.languageCode === selectedSubtitle)?.languageName}` : "Enable subtitles"}
                aria-haspopup="true"
                aria-expanded={showSubtitleMenu}
              >
                <CatIcon className="h-5 w-5" />
              </button>
              
              {showSubtitleMenu && (
                <div className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded shadow-lg py-2 w-48">
                  <button
                    onClick={() => handleSubtitleSelect(null)}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                      !selectedSubtitle ? 'text-blue-400' : 'text-white'
                    }`}
                  >
                    Off
                  </button>
                  {subtitles.map(subtitle => (
                    <button
                      key={subtitle.languageCode}
                      onClick={() => handleSubtitleSelect(subtitle.languageCode)}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-700 ${
                        selectedSubtitle === subtitle.languageCode ? 'text-blue-400' : 'text-white'
                      }`}
                    >
                      {subtitle.languageName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Restart */}
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setCurrentTime(0);
                  announce('Video restarted from beginning');
                }
              }}
              className="text-white hover:text-gray-300 transition-colors duration-150"
              aria-label="Restart video from beginning"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-gray-300 transition-colors duration-150"
              aria-label="Toggle fullscreen mode"
            >
              <Maximize className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Title */}
      {title && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent p-4">
          <h3 className="text-white font-medium" id={`video-description-${lessonId}`}>
            {title}
          </h3>
        </div>
      )}
    </div>
  );
};

export default ADACompliantVideoPlayer;