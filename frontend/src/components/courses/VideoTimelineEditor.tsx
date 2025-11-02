import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, Scissors, RotateCcw, 
  CheckCircle, X, ZoomIn, ZoomOut,
  FastForward, Rewind, Download,
  GripVertical, Clock, Save
} from 'lucide-react';

interface TimelineSegment {
  id: string;
  start: number;
  end: number;
  duration: number;
  blob: Blob;
}

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState<TimelineSegment[]>([]);
  const [cutPoints, setCutPoints] = useState<number[]>([]);
  const [zoom, setZoom] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize video metadata
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', () => {
        setDuration(videoRef.current?.duration || 0);
        
        // Create initial segment covering entire video
        const initialSegment: TimelineSegment = {
          id: 'initial',
          start: 0,
          end: videoRef.current?.duration || 0,
          duration: videoRef.current?.duration || 0,
          blob: videoBlob
        };
        setSegments([initialSegment]);
      });
    }
  }, [videoBlob]);

  // Generate timeline preview
  useEffect(() => {
    generateTimelinePreview();
  }, [videoUrl, zoom]);

  const generateTimelinePreview = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;
    const segmentCount = 10; // Number of preview frames
    const segmentWidth = canvas.width / segmentCount;

    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Capture frames at intervals
    for (let i = 0; i < segmentCount; i++) {
      const time = (i / segmentCount) * duration;
      video.currentTime = time;
      
      await new Promise(resolve => {
        video.onseeked = () => {
          ctx.drawImage(video, i * segmentWidth, 0, segmentWidth, canvas.height);
          resolve(null);
        };
      });
    }

    // Reset video time
    video.currentTime = currentTime;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const addCutPoint = () => {
    setCutPoints([...cutPoints, currentTime].sort((a, b) => a - b));
  };

  const removeCutPoint = (index: number) => {
    const newCutPoints = [...cutPoints];
    newCutPoints.splice(index, 1);
    setCutPoints(newCutPoints);
  };

  const createSegment = (start: number, end: number): TimelineSegment => {
    return {
      id: `segment-${Date.now()}-${Math.random()}`,
      start,
      end,
      duration: end - start,
      blob: videoBlob // In real implementation, this would be the actual segment blob
    };
  };

  const splitSegment = () => {
    if (cutPoints.length === 0) return;

    const newSegments: TimelineSegment[] = [];
    let lastPoint = 0;

    cutPoints.forEach(cutPoint => {
      if (cutPoint > lastPoint && cutPoint < duration) {
        newSegments.push(createSegment(lastPoint, cutPoint));
        lastPoint = cutPoint;
      }
    });

    // Add final segment
    if (lastPoint < duration) {
      newSegments.push(createSegment(lastPoint, duration));
    }

    setSegments(newSegments);
    setCutPoints([]);
  };

  const removeSegment = (segmentId: string) => {
    setSegments(segments.filter(segment => segment.id !== segmentId));
  };

  const exportEditedVideo = async () => {
    setIsProcessing(true);
    
    try {
      // In a real implementation, this would use FFmpeg.js or a server endpoint
      // For now, we'll simulate the process and return the original blob
      // In production, this would actually process the segments
      
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing
      
      // For demo purposes, we'll just return the first segment's blob
      // In reality, you'd concatenate all segments
      const finalBlob = segments.length > 0 ? segments[0].blob : videoBlob;
      
      onEditComplete(finalBlob);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scissors className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Video Timeline Editor</h2>
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
                onClick={exportEditedVideo}
                disabled={isProcessing || segments.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 inline mr-2" />
                    Export Video
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row h-[calc(90vh-80px)]">
          {/* Video Preview */}
          <div className="lg:w-2/3 p-6 border-r border-gray-200">
            <div className="bg-black rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-64 lg:h-96 object-contain"
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>

            {/* Video Controls */}
            <div className="flex items-center justify-center space-x-4 mb-4">
              <button
                onClick={() => handleSeek(Math.max(0, currentTime - 5))}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <Rewind className="h-5 w-5" />
              </button>
              <button
                onClick={handlePlayPause}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700"
              >
                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
              </button>
              <button
                onClick={() => handleSeek(Math.min(duration, currentTime + 5))}
                className="p-2 text-gray-600 hover:text-gray-800"
              >
                <FastForward className="h-5 w-5" />
              </button>
              <button
                onClick={addCutPoint}
                className="p-2 text-red-600 hover:text-red-800"
                title="Add cut point at current time"
              >
                <Scissors className="h-5 w-5" />
              </button>
            </div>

            {/* Current Time Display */}
            <div className="text-center text-gray-600">
              <Clock className="h-4 w-4 inline mr-2" />
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>

          {/* Timeline & Segments */}
          <div className="lg:w-1/3 p-6 bg-gray-50 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Timeline Editor</h3>

            {/* Cut Points */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-700">Cut Points</h4>
                <button
                  onClick={splitSegment}
                  disabled={cutPoints.length === 0}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Split at Points
                </button>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {cutPoints.map((point, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded">
                    <span className="text-sm text-gray-600">
                      Cut at {formatTime(point)}
                    </span>
                    <button
                      onClick={() => removeCutPoint(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {cutPoints.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Click the scissors icon to add cut points
                  </p>
                )}
              </div>
            </div>

            {/* Segments */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Video Segments</h4>
              <div className="space-y-2">
                {segments.map((segment, index) => (
                  <div
                    key={segment.id}
                    className="p-3 bg-white border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">Segment {index + 1}</span>
                      {segments.length > 1 && (
                        <button
                          onClick={() => removeSegment(segment.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTime(segment.start)} - {formatTime(segment.end)} 
                      ({formatTime(segment.duration)})
                    </div>
                    {/* Timeline visualization */}
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${(segment.duration / duration) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Canvas */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-700">Timeline Preview</h4>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                    className="p-1 text-gray-600 hover:text-gray-800"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setZoom(Math.min(2, zoom + 0.25))}
                    className="p-1 text-gray-600 hover:text-gray-800"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <canvas
                ref={canvasRef}
                width={400}
                height={80}
                className="w-full h-20 bg-gray-800 rounded border border-gray-300 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickX = e.clientX - rect.left;
                  const time = (clickX / rect.width) * duration;
                  handleSeek(time);
                }}
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0:00</span>
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