import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, CheckCircle, X,
  FastForward, Rewind,
  SkipBack, SkipForward, Scissors,
  RotateCcw, Maximize2, Minimize2
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
  const [showHelp] = useState(false);
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
  
  // Keep fixed 1x playback for simplicity
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 1;
    }
  }, []);

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
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className={`bg-slate-900 rounded-xl shadow-2xl w-full ${isFullscreen ? 'max-w-full h-full' : 'max-w-5xl max-h-[90vh]'} flex flex-col border border-slate-800 my-auto`}>
        {/* Header - Compact */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
              <Scissors className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Trim Video</h2>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleFullscreen}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-sm border border-slate-700 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={exportTrimmedVideo}
              disabled={isProcessing}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center shadow-lg shadow-blue-900/20"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white inline mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 inline mr-2" />
                  Save
                </>
              )}
            </button>
          </div>
        </div>

        {/* Help removed for minimal UI */}

        <div className="flex-1 flex flex-col overflow-y-auto bg-black relative min-h-[300px]">
          {/* Video Preview (minimal) */}
          <div className="flex-1 flex items-center justify-center p-4 relative bg-black/50">
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoUrl}
                className="max-w-full max-h-[50vh] object-contain shadow-2xl"
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
              {/* Minimal time indicator below */}
            </div>
          </div>

          {/* Controls Section */}
          <div className="bg-slate-900 border-t border-slate-800 p-3 flex-shrink-0 z-10">
            {/* Minimal Actions */}
            <div className="flex items-center justify-center space-x-2 mb-3 flex-wrap gap-y-2">
              <button
                onClick={resetTrim}
                className="px-2 py-1 text-[10px] bg-slate-800 text-slate-300 rounded border border-slate-700 hover:bg-slate-700 hover:text-white transition-all flex items-center"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </button>
            </div>
            
            {/* Playback Controls */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <button
                onClick={jumpToTrimStart}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleSeek(Math.max(trimStart, currentTime - 5))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <Rewind className="h-4 w-4" />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-all duration-200 shadow-lg shadow-blue-900/30 hover:scale-105 active:scale-95"
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 ml-0.5 fill-current" />}
              </button>
              <button
                onClick={() => handleSeek(Math.min(trimEnd, currentTime + 5))}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <FastForward className="h-4 w-4" />
              </button>
              <button
                onClick={jumpToTrimEnd}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Timeline */}
            <div className="space-y-2 max-w-5xl mx-auto">
              {/* Visual Timeline */}
              <div
                ref={timelineRef}
                className="relative h-16 bg-slate-800 rounded-lg cursor-pointer overflow-hidden select-none shadow-inner border border-slate-700"
                onClick={(e) => {
                  if (!isDraggingRef.current && timelineRef.current && duration > 0) {
                    const rect = timelineRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const time = (x / rect.width) * duration;
                    if (isFinite(time) && time >= 0 && time <= duration) {
                      handleSeek(time);
                    }
                  }
                }}
              >
                {/* Trimmed Region - Blue gradient */}
                <div
                  className="absolute top-0 bottom-0 bg-blue-500/20 border-l-2 border-r-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                  style={{
                    left: `${getTimelinePosition(trimStart)}%`,
                    right: `${100 - getTimelinePosition(trimEnd)}%`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-[9px] font-bold text-blue-300 bg-slate-900/40 px-1.5 py-0.5 rounded backdrop-blur-sm border border-blue-500/20">
                      KEEP
                    </div>
                  </div>
                </div>
                
                {/* Removed Regions - Dark overlay (no labels) */}
                <div className="absolute top-0 bottom-0 bg-black/50" style={{ left: 0, width: `${getTimelinePosition(trimStart)}%` }} />
                <div className="absolute top-0 bottom-0 bg-black/50" style={{ left: `${getTimelinePosition(trimEnd)}%`, right: 0 }} />

                {/* Current Time Indicator - White line with glow */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-10 shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  style={{ left: `${getTimelinePosition(currentTime)}%` }}
                >
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-sm"></div>
                </div>

                {/* Trim Start Handle - Blue */}
                <div
                  className="absolute top-0 bottom-0 w-6 bg-blue-600/0 hover:bg-blue-600/10 cursor-ew-resize transition-all z-20 flex flex-col items-center justify-center select-none group"
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
                  <div className="w-1 h-10 bg-blue-500 rounded-full shadow-lg group-hover:scale-110 transition-transform"></div>
                  <div className="absolute -bottom-5 text-[8px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 px-1 py-0.5 rounded border border-slate-700">
                    START
                  </div>
                </div>

                {/* Trim End Handle - Blue */}
                <div
                  className="absolute top-0 bottom-0 w-6 bg-blue-600/0 hover:bg-blue-600/10 cursor-ew-resize transition-all z-20 flex flex-col items-center justify-center select-none group"
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
                  <div className="w-1 h-10 bg-blue-500 rounded-full shadow-lg group-hover:scale-110 transition-transform"></div>
                  <div className="absolute -bottom-5 text-[8px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-slate-900 px-1 py-0.5 rounded border border-slate-700">
                    END
                  </div>
                </div>
              </div>

              {/* Time Markers */}
              <div className="flex justify-between text-[9px] text-slate-500 px-1 font-mono">
                {[0, 0.166, 0.333, 0.5, 0.666, 0.833, 1].map((p, i) => (
                  <span key={i}>{formatTime((duration || 0) * p)}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTimelineEditor;