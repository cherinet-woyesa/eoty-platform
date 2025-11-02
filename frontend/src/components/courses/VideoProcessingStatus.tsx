import React, { useState, useEffect } from 'react';
import { Loader, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

interface VideoProcessingStatusProps {
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onProcessingComplete: () => void;
}

const VideoProcessingStatus: React.FC<VideoProcessingStatusProps> = ({
  lessonId,
  isOpen,
  onClose,
  onProcessingComplete
}) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'queued' | 'processing' | 'completed' | 'failed'>('queued');
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (!isOpen || !lessonId) return;

    // Connect to WebSocket for real-time updates
    const wsUrl = `ws://localhost:5000/ws/video-progress?lessonId=${lessonId}`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected for progress updates');
      setStatus('processing');
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Progress update:', data);

      switch (data.type) {
        case 'progress':
          setProgress(data.progress);
          setCurrentStep(data.currentStep);
          setStatus('processing');
          break;
        
        case 'complete':
          setProgress(100);
          setStatus('completed');
          setCurrentStep('Processing complete');
          onProcessingComplete();
          break;
        
        case 'failed':
          setStatus('failed');
          setError(data.error);
          setCurrentStep('Processing failed');
          break;
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Connection lost');
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [isOpen, lessonId, onProcessingComplete]);

  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return <Clock className="h-8 w-8 text-yellow-500" />;
      case 'processing':
        return <Loader className="h-8 w-8 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <AlertCircle className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'queued':
        return 'Video queued for processing';
      case 'processing':
        return 'Processing video...';
      case 'completed':
        return 'Processing complete!';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center space-x-4 mb-4">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {getStatusText()}
            </h3>
            {currentStep && (
              <p className="text-sm text-gray-600 mt-1">{currentStep}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Processing Steps */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className={`flex items-center space-x-2 ${progress >= 20 ? 'text-green-600' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${progress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span>Upload complete</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${progress >= 40 ? 'text-green-600' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${progress >= 40 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span>Transcoding video</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${progress >= 70 ? 'text-green-600' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${progress >= 70 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span>Generating HLS streams</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${progress >= 90 ? 'text-green-600' : ''}`}>
            <div className={`w-2 h-2 rounded-full ${progress >= 90 ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span>Uploading to CDN</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 mt-6">
          {status === 'failed' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Close
            </button>
          )}
          
          {status === 'completed' && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              View Video
            </button>
          )}
          
          {(status === 'queued' || status === 'processing') && (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close (Processing continues)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoProcessingStatus;