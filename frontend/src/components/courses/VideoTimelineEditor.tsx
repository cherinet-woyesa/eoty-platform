import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, CheckCircle, X,
  FastForward, Rewind, Clock, 
  SkipBack, SkipForward, Scissors, Info, Volume2, VolumeX
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

  // Initialize video metadata
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', () => {
        const videoDuration = videoRef.current?.duration || 0;
        setDuration(videoDuration);
        setTrimEnd(videoDuration);
      });
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
      const time = (x / rect.width) * videoDuration;

      if (!isFinite(time) || time < 0) return;

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
    return duration > 0 ? (time / duration) * 100 : 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-red-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scissors className="h-6 w-6 text-orange-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Trim Your Video</h2>
                <p className="text-sm text-gray-600">Select the part you want to keep by dragging the orange handles</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <X className="h-4 w-4 inline mr-2" />
                Cancel
              </button>
              <button
                onClick={exportTrimmedVideo}
                disabled={isProcessing}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
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

        {/* Help Banner */}
        {showHelp && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100 flex items-start justify-between flex-shrink-0">
            <div className="flex items-start space-x-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-bold mb-1">How to trim your video:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Drag the <span className="font-semibold text-orange-600">orange handles</span> to set the start and end points</li>
                  <li>Click anywhere on the timeline to preview that part of the video</li>
                  <li>Use the playback controls to review your selected segment</li>
                  <li>Click "Save Trimmed Video" when you're satisfied with your selection</li>
                </ul>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="text-blue-600 hover:text-blue-800"
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
              
              {/* Time Display Overlay */}
              <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm font-mono flex items-center space-x-4">
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                <div className="flex items-center space-x-2">
                  <button onClick={toggleMute} className="hover:text-orange-400 transition-colors">
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-20 accent-orange-600"
                  />
                </div>
              </div>
              
              {/* Trim Info Overlay */}
              <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm">
                <div className="font-medium text-orange-400">Selected Segment</div>
                <div className="font-mono">{formatTime(trimStart)} - {formatTime(trimEnd)}</div>
                <div className="font-mono">Duration: {formatTime(getTrimmedDuration())}</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="bg-gray-50 border-t border-gray-200 p-6 flex-shrink-0">
            {/* Playback Controls */}
            <div className="flex items-center justify-center space-x-4 mb-6">
              <button
                onClick={jumpToTrimStart}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                title="Jump to trim start"
              >
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleSeek(Math.max(trimStart, currentTime - 5))}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                title="Rewind 5 seconds"
              >
                <Rewind className="h-5 w-5" />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-4 bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-colors shadow-lg"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
              </button>
              <button
                onClick={() => handleSeek(Math.min(trimEnd, currentTime + 5))}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                title="Forward 5 seconds"
              >
                <FastForward className="h-5 w-5" />
              </button>
              <button
                onClick={jumpToTrimEnd}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
                title="Jump to trim end"
              >
                <SkipForward className="h-5 w-5" />
              </button>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Selected Duration: <span className="font-semibold text-gray-900">{formatTime(getTrimmedDuration())}</span></span>
                </div>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                  Start: {formatTime(trimStart)} • End: {formatTime(trimEnd)}
                </div>
              </div>

              {/* Visual Timeline */}
              <div
                ref={timelineRef}
                className="relative h-24 bg-gray-200 rounded-lg cursor-pointer overflow-hidden select-none shadow-inner"
                onClick={(e) => {
                  if (!isDraggingRef.current && timelineRef.current && duration > 0) {
                    const rect = timelineRef.current.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const time = (x / rect.width) * duration;
                    if (isFinite(time) && time >= 0) {
                      handleSeek(time);
                    }
                  }
                }}
              >
                {/* Trimmed Region */}
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-orange-400/20 to-orange-500/20 border-l-4 border-r-4 border-orange-600 shadow-lg"
                  style={{
                    left: `${getTimelinePosition(trimStart)}%`,
                    right: `${100 - getTimelinePosition(trimEnd)}%`
                  }}
                />
                
                {/* Removed Regions */}
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-gray-400/50 to-gray-500/50 backdrop-blur-sm"
                  style={{
                    left: 0,
                    right: `${100 - getTimelinePosition(trimStart)}%`
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-700 font-bold bg-black/10">
                    WILL BE REMOVED
                  </div>
                </div>
                <div
                  className="absolute top-0 bottom-0 bg-gradient-to-r from-gray-500/50 to-gray-400/50 backdrop-blur-sm"
                  style={{
                    left: `${getTimelinePosition(trimEnd)}%`,
                    right: 0
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-700 font-bold bg-black/10">
                    WILL BE REMOVED
                  </div>
                </div>

                {/* Current Time Indicator */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-blue-600 z-10 shadow-lg"
                  style={{ left: `${getTimelinePosition(currentTime)}%` }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Trim Start Handle */}
                <div
                  className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-orange-500 to-orange-600 cursor-ew-resize hover:from-orange-600 hover:to-orange-700 transition-all z-20 flex items-center justify-center select-none shadow-xl border-2 border-white rounded-lg"
                  style={{ left: `${getTimelinePosition(trimStart)}%`, transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isDraggingRef.current = 'start';
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isDraggingRef.current = 'start';
                  }}
                >
                  <div className="w-1 h-8 bg-white rounded-full shadow"></div>
                </div>

                {/* Trim End Handle */}
                <div
                  className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-orange-500 to-orange-600 cursor-ew-resize hover:from-orange-600 hover:to-orange-700 transition-all z-20 flex items-center justify-center select-none shadow-xl border-2 border-white rounded-lg"
                  style={{ left: `${getTimelinePosition(trimEnd)}%`, transform: 'translateX(-50%)' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isDraggingRef.current = 'end';
                  }}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    isDraggingRef.current = 'end';
                  }}
                >
                  <div className="w-1 h-8 bg-white rounded-full shadow"></div>
                </div>
              </div>

              {/* Time Markers */}
              <div className="flex justify-between text-xs text-gray-500 px-2">
                <span>0:00.00</span>
                <span>{formatTime(duration / 4)}</span>
                <span>{formatTime(duration / 2)}</span>
                <span>{formatTime(3 * duration / 4)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoTimelineEditor;