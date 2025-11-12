import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, CheckCircle, X,
  FastForward, Rewind, Clock, 
  SkipBack, SkipForward, Scissors, Info, Volume2, VolumeX,
  RotateCcw, RotateCw, Maximize2, Minimize2, HelpCircle, ZoomIn, ZoomOut, Sparkles
} from 'lucide-react';

interface VideoTimelineEditorProps {
  videoBlob: Blob;
  videoUrl: string;
  onEditComplete: (editedBlob: Blob) => void;
  onCancel: () => void;
}

const VideoTimelineEditor: React.FC<VideoTimelineEditorProps> = ({
  videoBlob,
  videoUrl,
  onEditComplete,
  onCancel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<'start' | 'end' | null>(null);
  
  // Video state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  // Trim state
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [timelineZoom, setTimelineZoom] = useState(1); // Zoom level for timeline precision
  const [showPreview, setShowPreview] = useState(true);
  
  // History for undo/redo
  const [history, setHistory] = useState<Array<{ start: number; end: number }>>([{ start: 0, end: duration }]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Initialize video metadata
  useEffect(() => {
    if (videoRef.current) {
      const handleLoadedMetadata = () => {
        const videoDuration = videoRef.current?.duration || 0;
        setDuration(videoDuration);
        setTrimEnd(videoDuration);
        setHistory([{ start: 0, end: videoDuration }]);
      };
      
      videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        }
      };
    }
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSeek(Math.max(trimStart, currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSeek(Math.min(trimEnd, currentTime + 5));
          break;
        case 'Home':
          e.preventDefault();
          jumpToTrimStart();
          break;
        case 'End':
          e.preventDefault();
          jumpToTrimEnd();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleUndo();
          }
          break;
        case 'y':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleRedo();
          }
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentTime, trimStart, trimEnd, isPlaying]);
  
  // Update playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Handle mouse/touch drag for trim handles
  useEffect(() => {
    const handleMove = (clientX: number) => {
      if (!isDraggingRef.current || !timelineRef.current) return;
      
      const videoDuration = videoRef.current?.duration || 0;
      if (!videoDuration || videoDuration <= 0) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      
      // Account for zoom in timeline calculation
      const { start: visibleStart, end: visibleEnd } = getVisibleTimeRange();
      const visibleDuration = visibleEnd - visibleStart;
      const time = visibleStart + (x / rect.width) * visibleDuration;

      if (!isFinite(time) || time < 0 || time > videoDuration) return;

      if (isDraggingRef.current === 'start') {
        setTrimStart(prevStart => {
          setTrimEnd(prevEnd => {
            const newStart = Math.min(time, prevEnd - 0.5);
            if (isFinite(newStart) && newStart >= 0) {
              if (videoRef.current) {
                videoRef.current.currentTime = newStart;
              }
              return newStart;
            }
            return prevStart;
          });
          return prevStart;
        });
      } else if (isDraggingRef.current === 'end') {
        setTrimEnd(prevEnd => {
          setTrimStart(prevStart => {
            const newEnd = Math.max(time, prevStart + 0.5);
            if (isFinite(newEnd) && newEnd >= 0) {
              if (videoRef.current) {
                videoRef.current.currentTime = newEnd;
              }
              return newEnd;
            }
            return prevEnd;
          });
          return prevEnd;
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        handleMove(e.touches[0].clientX);
      }
    };

    const handleEnd = () => {
      isDraggingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, []); // Empty dependency array - only set up once

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        // If at end, restart from trim start
        if (currentTime >= trimEnd) {
          videoRef.current.currentTime = trimStart;
        }
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current && isFinite(time) && time >= 0 && duration > 0) {
      const clampedTime = Math.min(Math.max(trimStart, time), trimEnd);
      videoRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  };

  const jumpToTrimStart = () => {
    handleSeek(trimStart);
  };

  const jumpToTrimEnd = () => {
    handleSeek(trimEnd);
  };

  const handleVolumeChange = (newVolume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) {
        setVolume(0);
      } else {
        setVolume(videoRef.current.volume);
      }
    }
  };

  const exportTrimmedVideo = async () => {
    setIsProcessing(true);
    
    try {
      if (trimStart === 0 && trimEnd === duration) {
        // No trimming needed
        onEditComplete(videoBlob);
        return;
      }

      // Process the video with trim points
      const trimmedBlob = await processTrimmedVideo(trimStart, trimEnd);
      onEditComplete(trimmedBlob);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processTrimmedVideo = async (start: number, end: number): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const video = videoRef.current;
        if (!video) {
          reject(new Error('Video element not found'));
          return;
        }

        // Create canvas for capturing frames
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Create MediaRecorder
        const stream = canvas.captureStream(30);
        const chunks: Blob[] = [];
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9,opus',
          videoBitsPerSecond: 2500000
        });

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const finalBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(finalBlob);
        };

        mediaRecorder.onerror = (error) => {
          reject(error);
        };

        // Start recording
        mediaRecorder.start(100);

        // Seek to start and play
        video.currentTime = start;
        
        await new Promise<void>((resolvePlayback) => {
          video.onseeked = () => {
            video.play();
            
            const captureFrame = () => {
              if (video.currentTime >= end) {
                video.pause();
                mediaRecorder.stop();
                resolvePlayback();
                return;
              }
              
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              requestAnimationFrame(captureFrame);
            };

            captureFrame();
          };
        });
      } catch (error) {
        reject(error);
      }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getTrimmedDuration = () => {
    return trimEnd - trimStart;
  };

  const getTimelinePosition = (time: number) => {
    if (duration <= 0) return 0;
    // Apply zoom to focus on trimmed region
    const visibleStart = Math.max(0, trimStart - (trimEnd - trimStart) * timelineZoom);
    const visibleEnd = Math.min(duration, trimEnd + (trimEnd - trimStart) * timelineZoom);
    const visibleDuration = visibleEnd - visibleStart;
    if (visibleDuration <= 0) return 0;
    return ((time - visibleStart) / visibleDuration) * 100;
  };

  // Get visible time range for zoomed timeline
  const getVisibleTimeRange = () => {
    const visibleStart = Math.max(0, trimStart - (trimEnd - trimStart) * timelineZoom);
    const visibleEnd = Math.min(duration, trimEnd + (trimEnd - trimStart) * timelineZoom);
    return { start: visibleStart, end: visibleEnd };
  };
  
  // Quick trim functions
  const removeFirstSeconds = (seconds: number) => {
    const newStart = Math.min(trimStart + seconds, trimEnd - 0.5);
    if (newStart >= 0 && newStart < trimEnd) {
      saveToHistory();
      setTrimStart(newStart);
      handleSeek(newStart);
    }
  };
  
  const removeLastSeconds = (seconds: number) => {
    const newEnd = Math.max(trimEnd - seconds, trimStart + 0.5);
    if (newEnd > trimStart && newEnd <= duration) {
      saveToHistory();
      setTrimEnd(newEnd);
      handleSeek(newEnd);
    }
  };
  
  const resetTrim = () => {
    saveToHistory();
    setTrimStart(0);
    setTrimEnd(duration);
    handleSeek(0);
  };
  
  // History management
  const saveToHistory = () => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ start: trimStart, end: trimEnd });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };
  
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setTrimStart(prevState.start);
      setTrimEnd(prevState.end);
      handleSeek(prevState.start);
    }
  };
  
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setTrimStart(nextState.start);
      setTrimEnd(nextState.end);
      handleSeek(nextState.start);
    }
  };
  
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-gradient-to-br from-white/95 via-[#FAF8F3]/95 to-[#F5F3ED]/95 rounded-2xl shadow-2xl w-full ${isFullscreen ? 'max-w-full h-full' : 'max-w-6xl max-h-[95vh]'} overflow-hidden flex flex-col border border-slate-200/50 backdrop-blur-md`}>
        {/* Header - Light beige/silver theme */}
        <div className="px-6 py-4 border-b border-slate-200/50 bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white/70 backdrop-blur-sm border border-slate-200/50">
                <Scissors className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-700">Trim Your Video</h2>
                <p className="text-sm text-slate-600">Select the part you want to keep by dragging the handles</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleFullscreen}
                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors border border-slate-200/50"
                title="Toggle fullscreen"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-slate-300/50 rounded-lg bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white hover:border-slate-400/50 transition-all duration-200"
              >
                <X className="h-4 w-4 inline mr-2" />
                Cancel
              </button>
              <button
                onClick={exportTrimmedVideo}
                disabled={isProcessing}
                className="px-6 py-2 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-lg hover:from-[#00E6B8] hover:to-[#00D4A3] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium flex items-center shadow-lg hover:shadow-[#39FF14]/40 backdrop-blur-sm border border-[#39FF14]/30"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Save Trimmed Video
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Help Banner - Light theme */}
        {showHelp && (
          <div className="px-6 py-4 bg-gradient-to-r from-[#00D4FF]/10 to-[#00B8E6]/10 border-b border-slate-200/50 flex items-start justify-between flex-shrink-0 backdrop-blur-sm">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-[#00D4FF] flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-bold mb-1">How to trim your video:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Drag the <span className="font-semibold text-[#FFD700]">gold handles</span> to set the start and end points</li>
                  <li>Click anywhere on the timeline to preview that part of the video</li>
                  <li>Use the playback controls or keyboard shortcuts (Space, Arrow keys) to review</li>
                  <li>Use quick trim buttons to remove seconds from start/end</li>
                  <li>Click "Save Trimmed Video" when you're satisfied with your selection</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="text-slate-600 hover:text-slate-700 p-1 rounded hover:bg-white/50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Video Preview */}
          <div className="flex-1 bg-black flex items-center justify-center p-6">
            <div className="relative w-full h-full max-w-4xl">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain rounded-lg"
                onTimeUpdate={() => {
                  const time = videoRef.current?.currentTime || 0;
                  setCurrentTime(time);
                  // Auto-pause at trim end
                  if (time >= trimEnd && isPlaying) {
                    videoRef.current?.pause();
                    setIsPlaying(false);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              
              {/* Time Display Overlay - Light theme */}
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-700 px-3 py-2 rounded-lg text-sm font-mono flex items-center space-x-4 border border-slate-200/50 shadow-lg">
                <span className="font-semibold">{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="flex items-center space-x-2">
                  <button onClick={toggleMute} className="hover:text-[#FFD700] transition-colors p-1 rounded">
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 accent-[#FFD700]"
                  />
                </div>
              </div>
              
              {/* Trim Info Overlay - Light theme */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm text-slate-700 px-3 py-2 rounded-lg text-sm border border-slate-200/50 shadow-lg">
                <div className="font-medium text-[#FFD700] flex items-center space-x-1 mb-1">
                  <Scissors className="h-4 w-4" />
                  <span>Selected Segment</span>
                </div>
                <div className="font-mono text-xs space-y-0.5">
                  <div>Start: {formatTime(trimStart)}</div>
                  <div>End: {formatTime(trimEnd)}</div>
                  <div className="pt-1 border-t border-slate-200 mt-1">
                    <span className="text-[#39FF14] font-semibold">Keep: {formatTime(getTrimmedDuration())}</span>
                  </div>
                </div>
              </div>
              
              {/* Playback Speed Control */}
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm text-slate-700 px-3 py-2 rounded-lg text-sm border border-slate-200/50 shadow-lg">
                <label className="text-xs text-slate-600 mb-1 block">Playback Speed</label>
                <select
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                  className="text-xs bg-white border border-slate-300 rounded px-2 py-1 focus:ring-2 focus:ring-[#FFD700]/50"
                >
                  <option value="0.25">0.25x</option>
                  <option value="0.5">0.5x</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1x</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>
              </div>
            </div>
          </div>

          {/* Controls - Light theme */}
          <div className="bg-white/85 backdrop-blur-sm border-t border-slate-200/50 p-6 flex-shrink-0">
            {/* Quick Actions Bar */}
            <div className="flex items-center justify-center space-x-2 mb-4 flex-wrap">
              <button
                onClick={() => removeFirstSeconds(5)}
                className="px-3 py-1.5 text-xs bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-200"
                title="Remove first 5 seconds"
              >
                -5s Start
              </button>
              <button
                onClick={() => removeLastSeconds(5)}
                className="px-3 py-1.5 text-xs bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-200"
                title="Remove last 5 seconds"
              >
                -5s End
              </button>
              <button
                onClick={resetTrim}
                className="px-3 py-1.5 text-xs bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 transition-all duration-200 flex items-center"
                title="Reset trim"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </button>
              <div className="w-px h-6 bg-slate-300"></div>
              <button
                onClick={() => setTimelineZoom(Math.max(0.1, timelineZoom - 0.2))}
                disabled={timelineZoom <= 0.1}
                className="px-3 py-1.5 text-xs bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                title="Zoom out timeline"
              >
                <ZoomOut className="h-3 w-3 mr-1" />
                Zoom Out
              </button>
              <button
                onClick={() => setTimelineZoom(Math.min(2, timelineZoom + 0.2))}
                disabled={timelineZoom >= 2}
                className="px-3 py-1.5 text-xs bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                title="Zoom in timeline"
              >
                <ZoomIn className="h-3 w-3 mr-1" />
                Zoom In
              </button>
              <div className="w-px h-6 bg-slate-300"></div>
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="px-3 py-1.5 text-xs bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                title="Undo (Ctrl+Z)"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Undo
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="px-3 py-1.5 text-xs bg-white/90 backdrop-blur-sm text-slate-700 rounded-lg border border-slate-300/50 hover:bg-white hover:border-slate-400/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center"
                title="Redo (Ctrl+Y)"
              >
                <RotateCw className="h-3 w-3 mr-1" />
                Redo
              </button>
            </div>
            
            {/* Playback Controls */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button
                onClick={jumpToTrimStart}
                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors border border-slate-200/50"
                title="Jump to trim start (Home)"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleSeek(Math.max(trimStart, currentTime - 5))}
                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors border border-slate-200/50"
                title="Rewind 5 seconds (←)"
              >
                <Rewind className="h-5 w-5" />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-4 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-full hover:from-[#00E6B8] hover:to-[#00D4A3] transition-all duration-200 shadow-lg hover:shadow-[#39FF14]/40 backdrop-blur-sm border border-[#39FF14]/30"
                title="Play/Pause (Space)"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </button>
              <button
                onClick={() => handleSeek(Math.min(trimEnd, currentTime + 5))}
                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors border border-slate-200/50"
                title="Forward 5 seconds (→)"
              >
                <FastForward className="h-5 w-5" />
              </button>
              <button
                onClick={jumpToTrimEnd}
                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors border border-slate-200/50"
                title="Jump to trim end (End)"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-slate-600">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-[#FFD700]" />
                  <span>Selected Duration: <span className="font-semibold text-slate-700">{formatTime(getTrimmedDuration())}</span></span>
                </div>
                <div className="text-xs text-slate-500 bg-white/90 backdrop-blur-sm px-2 py-1 rounded border border-slate-200/50">
                  Start: {formatTime(trimStart)} • End: {formatTime(trimEnd)}
                </div>
              </div>

              {/* Visual Timeline */}
              <div
                ref={timelineRef}
                className="relative h-32 bg-slate-200/50 rounded-lg cursor-pointer overflow-hidden select-none shadow-inner border border-slate-300/50"
                onClick={(e) => {
                  if (!isDraggingRef.current && timelineRef.current && duration > 0) {
                    const rect = timelineRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const { start: visibleStart, end: visibleEnd } = getVisibleTimeRange();
                    const visibleDuration = visibleEnd - visibleStart;
                    const time = visibleStart + (x / rect.width) * visibleDuration;
                    if (isFinite(time) && time >= 0 && time <= duration) {
                      handleSeek(time);
                    }
                  }
                }}
              >
                {/* Trimmed Region - Gold/Orange gradient with pattern */}
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-[#FFD700]/30 to-[#FFA500]/30 border-l-4 border-r-4 border-[#FFD700] shadow-lg"
                  style={{
                    left: `${getTimelinePosition(trimStart)}%`,
                    right: `${100 - getTimelinePosition(trimEnd)}%`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xs font-bold text-[#FFD700] bg-white/20 px-2 py-1 rounded backdrop-blur-sm">
                      KEEP THIS
                    </div>
                  </div>
                </div>
                
                {/* Removed Regions - Light grey with diagonal pattern */}
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-slate-300/40 to-slate-400/40 backdrop-blur-sm"
                  style={{
                    left: 0,
                    width: `${getTimelinePosition(trimStart)}%`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-medium bg-white/10">
                    <div className="text-center">
                      <X className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <div>REMOVE</div>
                    </div>
                  </div>
                </div>
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-slate-400/40 to-slate-300/40 backdrop-blur-sm"
                  style={{
                    left: `${getTimelinePosition(trimEnd)}%`,
                    right: 0
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-medium bg-white/10">
                    <div className="text-center">
                      <X className="h-4 w-4 mx-auto mb-1 text-slate-400" />
                      <div>REMOVE</div>
                    </div>
                  </div>
                </div>

                {/* Current Time Indicator - Cyan neon */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#00D4FF] to-[#00B8E6] z-10 shadow-lg"
                  style={{ left: `${getTimelinePosition(currentTime)}%` }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gradient-to-r from-[#00D4FF] to-[#00B8E6] rounded-full flex items-center justify-center border-2 border-white shadow-md">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Trim Start Handle - Gold with label */}
                <div
                  className="absolute top-0 bottom-0 w-10 bg-gradient-to-r from-[#FFD700]/90 to-[#FFA500]/90 cursor-ew-resize hover:from-[#FFC107] hover:to-[#FF8C00] transition-all z-20 flex flex-col items-center justify-center select-none shadow-xl border-2 border-white rounded-lg group"
                  style={{ left: `${getTimelinePosition(trimStart)}%`, transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isDraggingRef.current = 'start';
                    saveToHistory();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isDraggingRef.current = 'start';
                    saveToHistory();
                  }}
                >
                  <div className="w-1 h-8 bg-white rounded-full shadow mb-1"></div>
                  <div className="text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    START
                  </div>
                </div>

                {/* Trim End Handle - Gold with label */}
                <div
                  className="absolute top-0 bottom-0 w-10 bg-gradient-to-r from-[#FFD700]/90 to-[#FFA500]/90 cursor-ew-resize hover:from-[#FFC107] hover:to-[#FF8C00] transition-all z-20 flex flex-col items-center justify-center select-none shadow-xl border-2 border-white rounded-lg group"
                  style={{ left: `${getTimelinePosition(trimEnd)}%`, transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isDraggingRef.current = 'end';
                    saveToHistory();
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isDraggingRef.current = 'end';
                    saveToHistory();
                  }}
                >
                  <div className="w-1 h-8 bg-white rounded-full shadow mb-1"></div>
                  <div className="text-[8px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    END
                  </div>
                </div>
              </div>

              {/* Time Markers */}
              <div className="flex justify-between text-xs text-slate-500 px-2">
                {(() => {
                  const { start: visibleStart, end: visibleEnd } = getVisibleTimeRange();
                  const markers = [];
                  for (let i = 0; i <= 4; i++) {
                    const time = visibleStart + ((visibleEnd - visibleStart) / 4) * i;
                    markers.push(<span key={i}>{formatTime(time)}</span>);
                  }
                  return markers;
                })()}
              </div>

              {/* Timeline Info */}
              <div className="mt-2 p-2 bg-gradient-to-r from-[#39FF14]/10 to-[#00FF41]/10 rounded-lg border border-[#39FF14]/30">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Sparkles className="h-3 w-3 text-[#39FF14]" />
                      <span className="text-slate-700 font-medium">Trimmed Duration:</span>
                      <span className="text-slate-800 font-bold">{formatTime(getTrimmedDuration())}</span>
                    </div>
                    <div className="text-slate-600">
                      <span className="font-medium">Original:</span> {formatTime(duration)}
                    </div>
                    <div className="text-slate-600">
                      <span className="font-medium">Saved:</span> {formatTime(duration - getTrimmedDuration())}
                    </div>
                  </div>
                  {timelineZoom !== 1 && (
                    <div className="text-slate-500 text-xs">
                      Zoom: {timelineZoom.toFixed(1)}x
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTimelineEditor;