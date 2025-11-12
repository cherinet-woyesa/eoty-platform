import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Upload, X, Settings } from 'lucide-react';
import { formatTime } from '@/utils/formatters';
// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

interface VideoPreviewPlayerProps {
  videoBlob?: Blob | null;
  videoUrl?: string | null;
  onUpload: () => void;
  onEdit?: () => void;
  onCancel: () => void;
  title?: string;
  duration?: number;
}

const VideoPreviewPlayer: React.FC<VideoPreviewPlayerProps> = ({
  videoBlob,
  videoUrl,
  onUpload,
  onEdit,
  onCancel,
  title,
  duration
}) => {
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Set video source
  useEffect(() => {
    if (videoRef.current) {
      if (videoBlob) {
        videoRef.current.src = URL.createObjectURL(videoBlob);
      } else if (videoUrl) {
        videoRef.current.src = videoUrl;
      }
    }

    return () => {
      if (videoRef.current && videoRef.current.src) {
        URL.revokeObjectURL(videoRef.current.src);
      }
    };
  }, [videoBlob, videoUrl]);

  // Update duration when video metadata loads
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration || duration || 0);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => video.removeEventListener('loadedmetadata', handleLoadedMetadata);
  }, [duration]);

  // Update current time
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, []);

  // Handle play/pause
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Toggle mute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  // Handle playback rate change
  const handlePlaybackRateChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Handle video end
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      video.currentTime = 0;
    };

    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, []);

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  if (!videoBlob && !videoUrl) {
    return null;
  }

  return (
    <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-200/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90">
        <h3 className="text-lg font-bold text-slate-700">Video Preview</h3>
        <button
          onClick={onCancel}
          className="p-2 rounded-full hover:bg-slate-100/50 text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Video Player */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          className="w-full aspect-video"
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
          {/* Top Controls */}
          <div className="absolute top-4 right-4 flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all"
                title="Playback Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              {showSettings && (
                <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-sm rounded-lg p-2 min-w-[120px] z-10">
                  <div className="text-xs text-white/70 mb-2 px-2">Playback Speed</div>
                  {playbackRates.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => handlePlaybackRateChange(rate)}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded hover:bg-white/10 transition-colors ${
                        playbackRate === rate ? 'bg-[#4FC3F7]/20 text-[#4FC3F7]' : 'text-white'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all"
              title="Fullscreen"
            >
              <Maximize className="h-4 w-4" />
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3">
            {/* Progress Bar */}
            <div className="flex items-center space-x-2">
              <span className="text-white text-xs font-medium min-w-[50px]">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min="0"
                max={videoDuration || 0}
                value={currentTime}
                onChange={handleSeek}
                className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#4FC3F7]"
                style={{
                  background: `linear-gradient(to right, #4FC3F7 0%, #4FC3F7 ${(currentTime / (videoDuration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (videoDuration || 1)) * 100}%, rgba(255,255,255,0.2) 100%)`
                }}
              />
              <span className="text-white text-xs font-medium min-w-[50px]">
                {formatTime(videoDuration)}
              </span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={togglePlayPause}
                  className="p-2 bg-[#4FC3F7]/90 hover:bg-[#4FC3F7] text-white rounded-lg transition-all"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 bg-black/70 hover:bg-black/90 text-white rounded-lg transition-all"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>

                <div className="flex items-center space-x-2 w-24">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#4FC3F7]"
                  />
                </div>

                {playbackRate !== 1 && (
                  <span className="text-white text-xs font-medium px-2 py-1 bg-black/70 rounded">
                    {playbackRate}x
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="px-4 py-2 bg-gradient-to-r from-[#FFD700]/90 to-[#FFA500]/90 text-white rounded-lg hover:from-[#FFA500] hover:to-[#FF8C00] transition-all text-sm font-medium flex items-center space-x-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={onUpload}
                  className="px-4 py-2 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-lg hover:from-[#00E6B8] hover:to-[#00D4A3] transition-all text-sm font-medium flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Info */}
      {title && (
        <div className="p-4 border-t border-slate-200/50">
          <p className="text-sm text-slate-700 font-medium">{title}</p>
          {videoDuration > 0 && (
            <p className="text-xs text-slate-500 mt-1">Duration: {formatTime(videoDuration)}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoPreviewPlayer;

